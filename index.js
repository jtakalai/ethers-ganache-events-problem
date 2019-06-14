const { spawn } = require("child_process")
const { utils, ContractFactory, Wallet, providers: { JsonRpcProvider } } = require("ethers")
const Web3 = require("web3")
const solc = require("solc")

const code = `
pragma solidity ^0.4.24;

contract EventTest {
    event TestEvent(string msg);

    constructor() public {
        emit TestEvent("created");
    }

    function fun() public {
        emit TestEvent("called");
    }
}`
const { bytecode, interface } = solc.compile(code).contracts[":EventTest"]
const abi = JSON.parse(interface)
const key = "0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0"

const log = process.env.VERBOSE ? console.log : () => {}

const ganacheBlockDelay = process.env.DELAY || "0"

const sleep = ms => new Promise(resolve => { setTimeout(resolve, ms) })

startGanache(8456, log).then(async ganache => {
    const provider = new JsonRpcProvider(ganache.httpUrl)
    provider.on({ topics: [utils.id("TestEvent(string)")] }, async event => {
        console.log(`Ethers.js got event ${JSON.stringify(event)}`)
    })

    const web3 = new Web3(ganache.url)
    const sub = web3.eth.subscribe("logs", {
        topics: [utils.id("TestEvent(string)")]
    }, (err, result) => {
        if (err) {
            console.error(err.toString())
        } else {
            console.log(`Web3.js got event ${JSON.stringify(result)}`)
        }
    })

    const wallet = new Wallet(key, provider)
    const deployer = new ContractFactory(abi, bytecode, wallet)
    const contract = await deployer.deploy()
    await contract.deployed()
    console.log(`Deployed at ${contract.address}`)
    const tr = await contract.fun()
    console.log(`Function call: ${JSON.stringify(tr)}`)

    await sleep(+ganacheBlockDelay * 1500 + 1000)
    await sub.unsubscribe()
    ganache.shutdown()
    process.exit(0)
})

async function startGanache(port, log, error, timeoutMs) {
    log = log || console.log
    error = error || console.error
    port = port || 8545
    const ganache = spawn(process.execPath, [
        "./node_modules/.bin/ganache-cli",
        "-m", "testrpc",
        "-p", port,
        "-b", ganacheBlockDelay  // to generate blocks every second instead of after each tx
    ])
    function onClose(code) { error(new Error("Ganache ethereum simulator exited with code " + code)) }
    ganache.on("close", onClose)
    function shutdown() {
        if (ganache.off) {
            ganache.off("close", onClose)
        }
        ganache.kill()
    }
    ganache.stderr.on("data", line => {
        log(" ERROR > " + line)
    })

    // Ganache is ready to use when it says "Listening on 127.0.0.1:8545"
    return new Promise((done, fail) => {
        const timeoutHandle = setTimeout(fail, timeoutMs || 10000)
        let launching = true
        ganache.stdout.on("data", data => {
            const str = data.toString()
            str.split("\n").forEach(x => { log(x) })
            if (launching) {
                const match = str.match(/Listening on ([0-9.:]*)/)
                if (match) {
                    launching = false
                    clearTimeout(timeoutHandle)
                    const url = "ws://" + match[1]        // "127.0.0.1:8545"
                    const httpUrl = "http://" + match[1]
                    done({ url, httpUrl, process: ganache, shutdown })
                }
            }
        })
    })
}
