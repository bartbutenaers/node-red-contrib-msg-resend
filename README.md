# node-red-contrib-msg-resend
A Node Red node for resending flow messages.

Thanks to Colin Law and Dave C-J for providing me the basic [idea](https://groups.google.com/forum/#!searchin/node-red/butenaers/node-red/lAPYt5fxyUM/anAiSRkiFgAJ) of this node. 

## Install
Run the following npm command in your Node-RED environment.
```
npm install node-red-contrib-msg-resend
```

## Usage
This node will resend the *last* input message X times to the output port, at specified time intervals (of Y seconds each).  The resending will continue until the maximum number has been reached.  E.g. resend the last input message 3 times:

![Timeline 1](images/timeline1.png)

When a new input message arrives, the active resending process (of the previous input message) will be stopped.  And the resending process will start for the new input message.  E.g. msg1 has not been resend 3 times yet, when the new message msg2 arrives.  The resending of msg1 will be interrupted, and msg2 will be resend 3 times:

![Timeline 2](images/timeline2.png)

Remark: An error will be generated, if input messages arrive too fast.

Example use case: When a door has been opened, a siren should play an alarm sound five times in 2 minutes ...

## Node properties

### Resend interval
The interval (in seconds) between two resends can be specified.  E.g. an interval of 5 seconds means, that the last input message will be resend every 5 seconds.

### Max. count
The maximum number of resends (of the *same* input message) can be specified.  E.g. a maximum of 10 means, that the last input message will be resend maximum 10 times.

Remark: A value of 0 means that the message will be resend infinitly.

### Force cloning (advanced)
By default, the Node-Red flow framework will clone messages automatically: When a node puts a message on it's output port, that *original* message will be send (without cloning) via the first wire to the next node.  When multiple wires are connected to that output port, the message will be *cloned* automatically by Node-Red when send to wire 2, wire 3 ... :

![Cloning by framework](images/Framework_cloning.png)

This works fine until the 'Display 1' node is replaced by any node that actually is going to *change* the message it receives: 

![Cloning issue](images/Cloning_issue.png)

Indeed, the node-red-contrib-msg-resend node keeps a reference to the original message (to be able to resend it).  When that message is being changed by another node, the cloned messages (to 'Display 2' and 'Display 3') *will also contain those changes*!.

This issue can be solved easily by selecting the **force cloning** checkbox.  In that case node-red-contrib-msg-resend node will always clone the message itself, so the original message is never send on the wires (but only clones):

![Force cloning](images/Force_cloning.png)

Remark: be aware that the messages are now cloned twice (except from the first wire): once by the node-red-contrib-msg-resend node, and once by the Node-Red flow framework.  This might reduce performance e.g. when the message contains large buffers.  In those cases, it might be advisable to turn off the 'force cloning'...
