# node-red-contrib-msg-resend
A Node Red node for resending flow messages.

Thanks to Colin Law and Dave C-J for providing me the basic [idea](https://groups.google.com/forum/#!searchin/node-red/butenaers/node-red/lAPYt5fxyUM/anAiSRkiFgAJ) of this node. 

## Install
Run the following npm command in your Node-RED user directory (typically ~/.node-red):
```
npm install node-red-contrib-msg-resend
```

## Usage
This node will resend the *last* input message X times to the output port, at specified time intervals (of Y seconds each).  The resending will continue until the maximum number has been reached.  E.g. resend the last input message 3 times:

![Timeline 1](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-resend/master/images/timeline1.png)

When a new input message arrives, the active resending process (of the previous input message) will be stopped.  And the resending process will start for the new input message.  E.g. msg1 has not been resend 3 times yet, when the new message msg2 arrives.  The resending of msg1 will be interrupted, and msg2 will be resend 3 times:

![Timeline 2](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-resend/master/images/timeline2.png)

Remark: An error will be generated, if input messages arrive too fast.

Example use case: When a door has been opened, a siren should play an alarm sound five times in 2 minutes ...

## Node configuration

### Resend interval
The interval (in seconds) between two resends can be specified.  E.g. an interval of 5 seconds means, that the last input message will be resend every 5 seconds.

### Max. count
The maximum number of resends (of the *same* input message) can be specified.  E.g. a maximum of 10 means, that the last input message will be resend maximum 10 times.

Remark: A value of 0 means that the message will be resend infinitly.

### Force cloning (advanced)
By default, the Node-Red flow framework will clone messages automatically: When a node puts a message on it's output port, that *original* message will be send (without cloning) via the first wire to the next node.  When multiple wires are connected to that output port, the message will be *cloned* automatically by Node-Red when send to wire 2, wire 3 ... :

![Cloning by framework](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-resend/master/images/Framework_cloning.png)

This works fine until the 'Display 1' node is replaced by any node that actually is going to *change* the message it receives: 

![Cloning issue](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-resend/master/images/Cloning_issue.png)

Indeed, the node-red-contrib-msg-resend node keeps a reference to the original message (to be able to resend it).  When that message is being changed by another node, the cloned messages (to 'Display 2' and 'Display 3') *will also contain those changes*!.

This issue can be solved easily by selecting the **force cloning** checkbox.  In that case node-red-contrib-msg-resend node will always clone the message itself, so the original message is never send on the wires (but only clones):

![Force cloning](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-resend/master/images/Force_cloning.png)

Remark: be aware that the messages are now cloned twice (except from the first wire): once by the node-red-contrib-msg-resend node, and once by the Node-Red flow framework.  This might reduce performance e.g. when the message contains large buffers.  In those cases, it might be advisable to turn off the 'force cloning'...

## Node control (version 0.0.5 and above)
The node can also be controlled via incoming message properties:

* `resend_interval` : Specify the interval length (between successive resends) in number of seconds.
* `resend_max_count` : Specify the maximum number of resends.
* `resend_force_clone` : Specify 'true/false' to force message cloning or not.
* `resend_ignore` : Specify 'true/false' to indicate whether this message should be ignored for resending or not.  

Some use cases of resend_ignore=true :
* If a message **only** contains control properties, it is sometimes usefull that this message is not resended x times.  
* The resending process of another message can be **abort**ed, by sending a message that contains only 'resend_ignore=true' (this way the original resending is ended and no new resending process is started).

An example flow:

![Example flow](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-resend/master/images/Control_via_msg.png)

```
[{"id":"e565f207.a44da","type":"inject","z":"6beebf75.ed0b5","name":"Only data","topic":"","payload":"Data that should be resended","payloadType":"str","repeat":"","crontab":"","once":false,"x":272.89573669433594,"y":1329.4446411132812,"wires":[["844b7818.54bed8"]]},{"id":"844b7818.54bed8","type":"msg-resend","z":"6beebf75.ed0b5","interval":"5","maximum":"4","clone":false,"name":"","x":748.2776947021484,"y":1329.7153930664062,"wires":[["44d8aa0a.8837d4"]]},{"id":"44d8aa0a.8837d4","type":"debug","z":"6beebf75.ed0b5","name":"","active":true,"console":"false","complete":"true","x":919.8957366943359,"y":1329.4446411132812,"wires":[]},{"id":"e1476701.aa6bc8","type":"change","z":"6beebf75.ed0b5","name":"Settings & ignore","rules":[{"t":"set","p":"resend_interval","pt":"msg","to":"4","tot":"num"},{"t":"set","p":"resend_max_count","pt":"msg","to":"9","tot":"num"},{"t":"set","p":"resend_force_clone","pt":"msg","to":"true","tot":"bool"},{"t":"set","p":"resend_ignore","pt":"msg","to":"true","tot":"bool"}],"action":"","property":"","from":"","to":"","reg":false,"x":485.89573669433594,"y":1429.4446411132812,"wires":[["8ede89fc.b1f808","844b7818.54bed8"]]},{"id":"9f27a42.0eed858","type":"inject","z":"6beebf75.ed0b5","name":"Data & control","topic":"Data that should be resended","payload":"","payloadType":"str","repeat":"","crontab":"","once":false,"x":280.89581298828125,"y":1380.444580078125,"wires":[["26dc52d0.33db5e"]]},{"id":"c6f6338e.bb59b","type":"inject","z":"6beebf75.ed0b5","name":"Only control","topic":"Data that should not be resended","payload":"","payloadType":"str","repeat":"","crontab":"","once":false,"x":280.89581298828125,"y":1429.444580078125,"wires":[["e1476701.aa6bc8"]]},{"id":"26dc52d0.33db5e","type":"change","z":"6beebf75.ed0b5","name":"Settings","rules":[{"t":"set","p":"resend_interval","pt":"msg","to":"3","tot":"num"},{"t":"set","p":"resend_max_count","pt":"msg","to":"8","tot":"num"},{"t":"set","p":"resend_force_clone","pt":"msg","to":"false","tot":"bool"}],"action":"","property":"","from":"","to":"","reg":false,"x":514.8957366943359,"y":1380.4446411132812,"wires":[["8ede89fc.b1f808","844b7818.54bed8"]]},{"id":"a8de86f7.3fbab8","type":"inject","z":"6beebf75.ed0b5","name":"Abort current","topic":"Data that should not be resended","payload":"","payloadType":"str","repeat":"","crontab":"","once":false,"x":279.89581298828125,"y":1479.444580078125,"wires":[["dc117503.73cf88"]]},{"id":"dc117503.73cf88","type":"change","z":"6beebf75.ed0b5","name":"Ignore","rules":[{"t":"set","p":"resend_ignore","pt":"msg","to":"true","tot":"bool"}],"action":"","property":"","from":"","to":"","reg":false,"x":524.8958129882812,"y":1479.444580078125,"wires":[["8ede89fc.b1f808","844b7818.54bed8"]]}]
```
