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

### Topic dependent (version 0.0.6 and above)
By default, all messages will be taken into account (regardless of the their topic).  In case of topic-dependent resending, each topic will get it's own resending process.  When msg2 (with topic2) arrives during the resending of msg1 (with topic1), the resending of msg1 will not be stopped.  Instead both msg1 and msg2 will be resended simultaneously:

![Timeline 3](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-resend/master/images/timeline3.png)

When msg2 (with topic1) arrives during the resending of msg1 (with same topic1), the resending of msg1 will be aborted and the resending of msg2 will start:

![Timeline 4](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-resend/master/images/timeline4.png)

Remark: *when topic-dependent resending is activated, messages with empty topic will be ignored in the resending process!*

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
* `resend_by_topic` : Specify 'true/false' to activate topic-based resending (version 0.0.6 and above).
* `resend_force_clone` : Specify 'true/false' to force message cloning or not.
* `resend_ignore` : Specify 'true/false' to indicate whether this message should be ignored for resending or not.  

In version ***0.0.7 (and above)*** the properties (`resend_interval`, `resend_max_count` and `resend_force_clone`) can be controlled for EACH topic separately, when the `msg.topic` field is filled and the `resend_by_topic` is set to `true`.  An example flow:

![Setup per topic](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-resend/master/images/timeline6.png)

```
[{"id":"f4770e0b.6d5d9","type":"msg-resend","z":"6beebf75.ed0b5","interval":"1","maximum":"5","bytopic":true,"clone":false,"name":"TopicResending","x":1594.506923675537,"y":2126.75,"wires":[["b7eab8f1.5e97a8"]]},{"id":"b3a2f88e.35aa38","type":"inject","z":"6beebf75.ed0b5","name":"Start","topic":"","payload":"","payloadType":"str","repeat":"","crontab":"","once":false,"x":1200.5,"y":1964.5517873764038,"wires":[["4af88b92.f1aa74","d73dc08f.872bb","886dbc93.e203f"]]},{"id":"b7eab8f1.5e97a8","type":"debug","z":"6beebf75.ed0b5","name":"Resend test","active":true,"console":"false","complete":"payload","x":1779.506923675537,"y":2126.6631774902344,"wires":[]},{"id":"4af88b92.f1aa74","type":"change","z":"6beebf75.ed0b5","name":"Set properties","rules":[{"t":"set","p":"resend_interval","pt":"msg","to":"2","tot":"num"},{"t":"set","p":"resend_max_count","pt":"msg","to":"4","tot":"num"},{"t":"set","p":"topic","pt":"msg","to":"topic1","tot":"str"},{"t":"set","p":"payload","pt":"msg","to":"FromTopic1","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":1379.7452087402344,"y":1964.8592519760132,"wires":[["f4770e0b.6d5d9"]]},{"id":"d73dc08f.872bb","type":"change","z":"6beebf75.ed0b5","name":"Set properties","rules":[{"t":"set","p":"resend_interval","pt":"msg","to":"3","tot":"num"},{"t":"set","p":"resend_max_count","pt":"msg","to":"8","tot":"num"},{"t":"set","p":"topic","pt":"msg","to":"topic2","tot":"str"},{"t":"set","p":"payload","pt":"msg","to":"FromTopic2","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":1377.5069198608398,"y":2046.9998474121094,"wires":[["f4770e0b.6d5d9"]]},{"id":"255cab31.2f0f94","type":"comment","z":"6beebf75.ed0b5","name":"Topic 1 with interval of 2 sec and maximum of 4 messages","info":"","x":1333.752986907959,"y":1926.859049797058,"wires":[]},{"id":"62c3a047.c0a32","type":"comment","z":"6beebf75.ed0b5","name":"Topic 3 with default interval of 1 sec and maximum of 5 messages","info":"","x":1351.8922576904297,"y":2093.5168657302856,"wires":[]},{"id":"886dbc93.e203f","type":"change","z":"6beebf75.ed0b5","name":"Set properties","rules":[{"t":"set","p":"topic","pt":"msg","to":"topic3","tot":"str"},{"t":"set","p":"payload","pt":"msg","to":"FromTopic3","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":1376.506893157959,"y":2126.749674797058,"wires":[["f4770e0b.6d5d9"]]},{"id":"51618601.bbd448","type":"comment","z":"6beebf75.ed0b5","name":"Topic 2 with interval of 3 sec and maximum of 8 messages","info":"","x":1333.506893157959,"y":2013.999674797058,"wires":[]}]
```

Some use cases of resend_ignore=true :
* If a message **only** contains control properties, it is sometimes usefull that this message is not resended x times.  
* The resending process of another message can be **abort**ed, by sending a message that contains only 'resend_ignore=true' (this way the original resending is ended and no new resending process is started).

An example flow:

![Example flow](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-resend/master/images/Control_via_msg.png)

```
[{"id":"e565f207.a44da","type":"inject","z":"6beebf75.ed0b5","name":"Only data","topic":"","payload":"Data that should be resended","payloadType":"str","repeat":"","crontab":"","once":false,"x":272.89573669433594,"y":1329.4446411132812,"wires":[["844b7818.54bed8"]]},{"id":"844b7818.54bed8","type":"msg-resend","z":"6beebf75.ed0b5","interval":"5","maximum":"4","clone":false,"name":"","x":748.2776947021484,"y":1329.7153930664062,"wires":[["44d8aa0a.8837d4"]]},{"id":"44d8aa0a.8837d4","type":"debug","z":"6beebf75.ed0b5","name":"","active":true,"console":"false","complete":"true","x":919.8957366943359,"y":1329.4446411132812,"wires":[]},{"id":"e1476701.aa6bc8","type":"change","z":"6beebf75.ed0b5","name":"Settings & ignore","rules":[{"t":"set","p":"resend_interval","pt":"msg","to":"4","tot":"num"},{"t":"set","p":"resend_max_count","pt":"msg","to":"9","tot":"num"},{"t":"set","p":"resend_force_clone","pt":"msg","to":"true","tot":"bool"},{"t":"set","p":"resend_ignore","pt":"msg","to":"true","tot":"bool"}],"action":"","property":"","from":"","to":"","reg":false,"x":485.89573669433594,"y":1429.4446411132812,"wires":[["8ede89fc.b1f808","844b7818.54bed8"]]},{"id":"9f27a42.0eed858","type":"inject","z":"6beebf75.ed0b5","name":"Data & control","topic":"Data that should be resended","payload":"","payloadType":"str","repeat":"","crontab":"","once":false,"x":280.89581298828125,"y":1380.444580078125,"wires":[["26dc52d0.33db5e"]]},{"id":"c6f6338e.bb59b","type":"inject","z":"6beebf75.ed0b5","name":"Only control","topic":"Data that should not be resended","payload":"","payloadType":"str","repeat":"","crontab":"","once":false,"x":280.89581298828125,"y":1429.444580078125,"wires":[["e1476701.aa6bc8"]]},{"id":"26dc52d0.33db5e","type":"change","z":"6beebf75.ed0b5","name":"Settings","rules":[{"t":"set","p":"resend_interval","pt":"msg","to":"3","tot":"num"},{"t":"set","p":"resend_max_count","pt":"msg","to":"8","tot":"num"},{"t":"set","p":"resend_force_clone","pt":"msg","to":"false","tot":"bool"}],"action":"","property":"","from":"","to":"","reg":false,"x":514.8957366943359,"y":1380.4446411132812,"wires":[["8ede89fc.b1f808","844b7818.54bed8"]]},{"id":"a8de86f7.3fbab8","type":"inject","z":"6beebf75.ed0b5","name":"Abort current","topic":"Data that should not be resended","payload":"","payloadType":"str","repeat":"","crontab":"","once":false,"x":279.89581298828125,"y":1479.444580078125,"wires":[["dc117503.73cf88"]]},{"id":"dc117503.73cf88","type":"change","z":"6beebf75.ed0b5","name":"Ignore","rules":[{"t":"set","p":"resend_ignore","pt":"msg","to":"true","tot":"bool"}],"action":"","property":"","from":"","to":"","reg":false,"x":524.8958129882812,"y":1479.444580078125,"wires":[["8ede89fc.b1f808","844b7818.54bed8"]]}]
```

### Message rate limitation
Suppose the resend interval is set to 1 second. When a message msg1 (with topic_1) arrives, a timer will be setup that resends this message every second. However when a new message msg2 arrives (same topic_1) faster than 1 second: a new timer should be created and the previous timer (that didn't get a chance to send anything!) need to be removed. It is useles to create timers that don't get a chance to do anything. To prevent this, a `high input rate` error is displayed (and the new message will be ignored)...

![Timeline 5](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-resend/master/images/timeline5.png)

Remark: if messages arrive at high speed, this error will not occur if the messages have *different* topics.  Indeed the resend node will create a new timer for each message, even if they arrive at higher rates.
