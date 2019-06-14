# ethers-ganache-events-problem
Minimal test case for troubleshooting why ethers.js doesn't get events from Ganache (formerly TestRPC)

# Running

`node index.js`
* demonstrates that without blockDelay (ganache creates blocks after every tx) web3.js notices the events but ethers.js doesn't

`env DELAY=2 node index.js`
* demonstrates that ethers.js notices the event from function call but not from deployment

`env DELAY=4 node index.js`
* demonstrates that with sufficient delay, ethers.js notices all events

You can also specify `VERBOSE=1` if you want to see what ganache is doing.
