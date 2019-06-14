pragma solidity ^0.4.24;

contract EventTest {
    event TestEvent(string msg);

    constructor() public {
        emit TestEvent("just testing");
    }
}
