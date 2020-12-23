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

### Topic dependent
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

### Send first message after interval
When this option is disabled, the input message will be send the first time to the output *immediately when it arrives*.  From then on it is resended with interval X in between:

![Immediate output](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-resend/master/images/timeline_immediate.png)

When this option is enabled, the resending process will only start after interval X:

![Delayed output](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-resend/master/images/timeline_delay.png)

### Allow messages to arrive at high rates
When this option is disabled, the *message rate will be limited*. Suppose the resend interval is set to 1 second. When a message msg1 (with topic_1) arrives, a timer will be setup that resends this message every second. However when a new message msg2 arrives (same topic_1) faster than 1 second: a new timer should be created and the previous timer (that didn't get a chance to send anything!) need to be removed. It is useles to create timers that don't get a chance to do anything. To prevent this, a `high input rate` error is displayed (and the new message will be ignored)...

![Timeline 5](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-resend/master/images/timeline5.png)

Remark: if messages arrive at high speed, this error will not occur if the messages have *different* topics.  Indeed the resend node will create a new timer for each message, even if they arrive at higher rates.

When this option is enabled, all messages will be accepted (even the ones that arrive very fast after the previous message).  This way you can be sure that no message is ignored.  However make sure that messages don't keep arriving at high rate, because this will decrease performance (since timers keep being created and destroyed without being used).

### Add counters to output message
In some cases it might be useful to know an output message is the N-th resend of the input message.  When this option is enabled, the names of the two output message fields need to be specified:

![Output count fields](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-resend/master/images/output_count_fields.png)

The *Output Count* field will be filled with the current resend count, while the *Output Max* field will be filled with the maximum resend count (as specified in the config screen, or via a control message):

![Output count fields](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-resend/master/images/output_count_debug.png)

###  Wait for explicit resend_messages=true message
When this setting is disabled, the node will start immediately by resending input messages.  When enabled, the node will start immediately by simply passing messages (without resending them).  In that case an input message (containing `msg.resend_messages=true` is required to start resending the input messages).

## Node control
The node can also be controlled via incoming message properties:

* `resend_interval` : Specify the interval length (between successive resends) in number of seconds.
* `resend_max_count` : Specify the maximum number of resends.
* `resend_by_topic` : Specify 'true/false' to activate topic-based resending.
* `resend_force_clone` : Specify 'true/false' to force message cloning or not.
* `resend_ignore` : Specify 'true/false' to indicate whether this message should be ignored for resending or not.  When 'true', the message will not appear at the output port (i.e. not resended or even not simply passed through).
* `msg.resend_messages` : Specify whether this node has to resend messages ('true'), or simply pass the messages ('false') without resending them.
* `msg.resend_force` : Specifies that this message should always be resend, even if the node has been ordered to pass the messages without resending them.
* `msg.resend_never` : Specifies that this message should never be resend (i.e. it should always be passed without resending), even if the node has been ordered to resend the messages.
* `msg.resend_last_msg` : Specifies that the *previous* message should be resend/passed to the output.  So this message itself will not appear on the output.

### Topic dependent properties

The properties (`resend_interval`, `resend_max_count`, `resend_messages` and `resend_force_clone`) can be controlled for EACH topic separately, when the `msg.topic` field is filled and the *Topic Dependent* option is enabled.  An example flow:

![Setup per topic](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-resend/master/images/timeline6.png)

```
[{"id":"f4770e0b.6d5d9","type":"msg-resend","z":"6beebf75.ed0b5","interval":"1","maximum":"5","bytopic":true,"clone":false,"name":"TopicResending","x":1594.506923675537,"y":2126.75,"wires":[["b7eab8f1.5e97a8"]]},{"id":"b3a2f88e.35aa38","type":"inject","z":"6beebf75.ed0b5","name":"Start","topic":"","payload":"","payloadType":"str","repeat":"","crontab":"","once":false,"x":1200.5,"y":1964.5517873764038,"wires":[["4af88b92.f1aa74","d73dc08f.872bb","886dbc93.e203f"]]},{"id":"b7eab8f1.5e97a8","type":"debug","z":"6beebf75.ed0b5","name":"Resend test","active":true,"console":"false","complete":"payload","x":1779.506923675537,"y":2126.6631774902344,"wires":[]},{"id":"4af88b92.f1aa74","type":"change","z":"6beebf75.ed0b5","name":"Set properties","rules":[{"t":"set","p":"resend_interval","pt":"msg","to":"2","tot":"num"},{"t":"set","p":"resend_max_count","pt":"msg","to":"4","tot":"num"},{"t":"set","p":"topic","pt":"msg","to":"topic1","tot":"str"},{"t":"set","p":"payload","pt":"msg","to":"FromTopic1","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":1379.7452087402344,"y":1964.8592519760132,"wires":[["f4770e0b.6d5d9"]]},{"id":"d73dc08f.872bb","type":"change","z":"6beebf75.ed0b5","name":"Set properties","rules":[{"t":"set","p":"resend_interval","pt":"msg","to":"3","tot":"num"},{"t":"set","p":"resend_max_count","pt":"msg","to":"8","tot":"num"},{"t":"set","p":"topic","pt":"msg","to":"topic2","tot":"str"},{"t":"set","p":"payload","pt":"msg","to":"FromTopic2","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":1377.5069198608398,"y":2046.9998474121094,"wires":[["f4770e0b.6d5d9"]]},{"id":"255cab31.2f0f94","type":"comment","z":"6beebf75.ed0b5","name":"Topic 1 with interval of 2 sec and maximum of 4 messages","info":"","x":1333.752986907959,"y":1926.859049797058,"wires":[]},{"id":"62c3a047.c0a32","type":"comment","z":"6beebf75.ed0b5","name":"Topic 3 with default interval of 1 sec and maximum of 5 messages","info":"","x":1351.8922576904297,"y":2093.5168657302856,"wires":[]},{"id":"886dbc93.e203f","type":"change","z":"6beebf75.ed0b5","name":"Set properties","rules":[{"t":"set","p":"topic","pt":"msg","to":"topic3","tot":"str"},{"t":"set","p":"payload","pt":"msg","to":"FromTopic3","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":1376.506893157959,"y":2126.749674797058,"wires":[["f4770e0b.6d5d9"]]},{"id":"51618601.bbd448","type":"comment","z":"6beebf75.ed0b5","name":"Topic 2 with interval of 3 sec and maximum of 8 messages","info":"","x":1333.506893157959,"y":2013.999674797058,"wires":[]}]
```

### Manage the resending mode

The `msg.resend_messages` allows us to change the resending modus of this node:
+ When `true`, the node will resend all input messages.
+ When `false`, the node will simply pass-through all input messages (without resending them).  Note that the messages will be cloned, if the *"Force clone"* option in the config screen is activated.

The *"Wait for explicit resend_messages=true message"* option in the config screen can be used to specify in which modus this node should start:
+ When unselected, the node will resend all input messages from the start.
+ When selected, the node will pass-through all input messages from the start.

It is possible to inject messages that don't obey the current resending mode of this node:
* `msg.resend_force` : This msg should always be resend, even if the node is in pass-through modus.
* `msg.resend_never` : This msg should never be resend, even if the node is in resending modus. 

Finally `resend_ignore=true` is used to make sure that a msg will never be send to the output (i.e. never be resended and never passed through).  This is used in two cases:
+ For control messages, e.g. a message to change the resending mode.  Indeed such messages are only used to control this node, and don't need to arrive on the output.
+ To interrupt prematurely the current resending of another msg.  Indeed when this msg arrives, the current resending of the previous msg will be interrupted.  And **no** new resending process will be started (since it will be 'ignored' for resending)...

An example flow to demonstrate all those options:

![Control resending](https://user-images.githubusercontent.com/14224149/102976577-0faa4400-4502-11eb-9273-75d4eb558d18.png)
```
[{"id":"59598bca.9cca44","type":"msg-resend","z":"42b7b639.325dd8","interval":"1","intervalUnit":"secs","maximum":"4","bytopic":false,"clone":false,"firstDelayed":false,"addCounters":false,"waitForResend":true,"highRate":false,"outputCountField":"","outputMaxField":"","name":"","x":2150,"y":500,"wires":[["5b425903.0b78f8"]]},{"id":"9dd11c82.39201","type":"inject","z":"42b7b639.325dd8","name":"someValue","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"someValue","payloadType":"str","x":1820,"y":500,"wires":[["59598bca.9cca44"]]},{"id":"47a07507.095fdc","type":"inject","z":"42b7b639.325dd8","name":"Stop resend","props":[{"p":"resend_ignore","v":"true","vt":"bool"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","x":1830,"y":800,"wires":[["59598bca.9cca44"]]},{"id":"5b425903.0b78f8","type":"debug","z":"42b7b639.325dd8","name":"Output","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","statusVal":"","statusType":"auto","x":2310,"y":500,"wires":[]},{"id":"306ec40.c695c3c","type":"inject","z":"42b7b639.325dd8","name":"Stop resending","props":[{"p":"resend_messages","v":"false","vt":"bool"},{"p":"resend_ignore","v":"true","vt":"bool"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","x":1840,"y":880,"wires":[["59598bca.9cca44"]]},{"id":"83110a1.e2e25f8","type":"inject","z":"42b7b639.325dd8","name":"Start resending","props":[{"p":"resend_messages","v":"true","vt":"bool"},{"p":"resend_ignore","v":"true","vt":"bool"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","x":1840,"y":840,"wires":[["59598bca.9cca44"]]},{"id":"a9e21d46.01e66","type":"comment","z":"42b7b639.325dd8","name":"Control msg (never on output)","info":"","x":1860,"y":760,"wires":[]},{"id":"ca433ad7.568ca8","type":"inject","z":"42b7b639.325dd8","name":"alwaysResendValue","props":[{"p":"payload"},{"p":"resend_force","v":"true","vt":"bool"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"alwaysResendValue","payloadType":"str","x":1850,"y":600,"wires":[["59598bca.9cca44"]]},{"id":"3de2aebd.498ee2","type":"comment","z":"42b7b639.325dd8","name":"Always resend msg","info":"","x":1830,"y":560,"wires":[]},{"id":"1dd595bb.a40e7a","type":"comment","z":"42b7b639.325dd8","name":"Normal msg","info":"","x":1810,"y":460,"wires":[]},{"id":"c5167531.d47498","type":"inject","z":"42b7b639.325dd8","name":"neverResendValue","props":[{"p":"payload"},{"p":"resend_never","v":"true","vt":"bool"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"neverResendValue","payloadType":"str","x":1850,"y":700,"wires":[["59598bca.9cca44"]]},{"id":"7749ee82.98489","type":"comment","z":"42b7b639.325dd8","name":"Never resend msg","info":"","x":1830,"y":660,"wires":[]},{"id":"a461f716.384cc8","type":"inject","z":"42b7b639.325dd8","name":"Stop resending of previous msg","props":[{"p":"resend_ignore","v":"true","vt":"bool"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","x":1890,"y":920,"wires":[["59598bca.9cca44"]]}]
```

Note that all those options can be optionally ***topic dependent***.  Simply activate the *"Topic dependent"* checkbox in the config screen, and specify in the input message the topic (for which this msg is relevant).  When no topic is specified in the message, then it is applied to all messages without topic.  The following flow demonstrates this:

![Topic dependent control](https://user-images.githubusercontent.com/14224149/102977215-f6ee5e00-4502-11eb-9732-b79438801cd9.png)
```
[{"id":"47a6e4d0.e9890c","type":"msg-resend","z":"42b7b639.325dd8","interval":"1","intervalUnit":"secs","maximum":"3","bytopic":true,"clone":false,"firstDelayed":false,"addCounters":false,"waitForResend":false,"highRate":false,"outputCountField":"","outputMaxField":"","name":"","x":2610,"y":1100,"wires":[["2c674f7c.9e4ce"]]},{"id":"24a67425.81772c","type":"inject","z":"42b7b639.325dd8","name":"someValue","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"TOPIC_A","payload":"someValue","payloadType":"str","x":2220,"y":1100,"wires":[["47a6e4d0.e9890c"]]},{"id":"b52429ac.93ed78","type":"inject","z":"42b7b639.325dd8","name":"Stop resend","props":[{"p":"resend_ignore","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"TOPIC_A","x":2230,"y":1220,"wires":[["47a6e4d0.e9890c"]]},{"id":"2c674f7c.9e4ce","type":"debug","z":"42b7b639.325dd8","name":"Output","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","statusVal":"","statusType":"auto","x":2770,"y":1100,"wires":[]},{"id":"96f18e1f.ce573","type":"inject","z":"42b7b639.325dd8","name":"Stop resending","props":[{"p":"resend_messages","v":"false","vt":"bool"},{"p":"resend_ignore","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"TOPIC_A","x":2240,"y":1300,"wires":[["47a6e4d0.e9890c"]]},{"id":"2b7b5124.b01efe","type":"inject","z":"42b7b639.325dd8","name":"Start resending","props":[{"p":"resend_messages","v":"true","vt":"bool"},{"p":"resend_ignore","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"TOPIC_A","x":2240,"y":1260,"wires":[["47a6e4d0.e9890c"]]},{"id":"95cfd653.5efed8","type":"inject","z":"42b7b639.325dd8","name":"alwaysResendValue","props":[{"p":"payload"},{"p":"resend_force","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"TOPIC_A","payload":"alwaysResendValue","payloadType":"str","x":2250,"y":1140,"wires":[["47a6e4d0.e9890c"]]},{"id":"42c377f3.40f388","type":"inject","z":"42b7b639.325dd8","name":"neverResendValue","props":[{"p":"payload"},{"p":"resend_never","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"TOPIC_A","payload":"neverResendValue","payloadType":"str","x":2250,"y":1180,"wires":[["47a6e4d0.e9890c"]]},{"id":"66e43da2.e81494","type":"comment","z":"42b7b639.325dd8","name":"Topic A","info":"","x":2200,"y":1060,"wires":[]},{"id":"c8492c52.3081d","type":"inject","z":"42b7b639.325dd8","name":"someValue","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"TOPIC_B","payload":"someValue","payloadType":"str","x":2220,"y":1440,"wires":[["47a6e4d0.e9890c"]]},{"id":"b0393be5.bbcb98","type":"inject","z":"42b7b639.325dd8","name":"Stop resend","props":[{"p":"resend_ignore","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"TOPIC_B","x":2230,"y":1560,"wires":[["47a6e4d0.e9890c"]]},{"id":"f3318316.901fe","type":"inject","z":"42b7b639.325dd8","name":"Stop resending","props":[{"p":"resend_messages","v":"false","vt":"bool"},{"p":"resend_ignore","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"TOPIC_B","x":2240,"y":1640,"wires":[["47a6e4d0.e9890c"]]},{"id":"d469912e.eda73","type":"inject","z":"42b7b639.325dd8","name":"Start resending","props":[{"p":"resend_messages","v":"true","vt":"bool"},{"p":"resend_ignore","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"TOPIC_B","x":2240,"y":1600,"wires":[["47a6e4d0.e9890c"]]},{"id":"a7b7bb02.37bd88","type":"inject","z":"42b7b639.325dd8","name":"alwaysResendValue","props":[{"p":"payload"},{"p":"resend_force","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"TOPIC_B","payload":"alwaysResendValue","payloadType":"str","x":2250,"y":1480,"wires":[["47a6e4d0.e9890c"]]},{"id":"6a842c33.49fb84","type":"inject","z":"42b7b639.325dd8","name":"neverResendValue","props":[{"p":"payload"},{"p":"resend_never","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"TOPIC_B","payload":"neverResendValue","payloadType":"str","x":2250,"y":1520,"wires":[["47a6e4d0.e9890c"]]},{"id":"6dbe1d41.ae1bc4","type":"comment","z":"42b7b639.325dd8","name":"Topic B","info":"","x":2200,"y":1400,"wires":[]},{"id":"73a9161e.d59058","type":"inject","z":"42b7b639.325dd8","name":"Interrupt resending","props":[{"p":"resend_ignore","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"TOPIC_A","x":2250,"y":1340,"wires":[["47a6e4d0.e9890c"]]},{"id":"2310312.d83d3ce","type":"inject","z":"42b7b639.325dd8","name":"Interrupt resending","props":[{"p":"resend_ignore","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"TOPIC_B","x":2250,"y":1680,"wires":[["47a6e4d0.e9890c"]]}]
```

### Resending the last message

By injecting a message with `msg.resend_last_msg=true`, the last previous message (if available) will be processed again by this node.  Which means that the last message will be resend or passed through, based on the current settings of this node. 

Note that:
+ All other fields of this message (except from the `msg.topic`) will be ignored, since the node will process the previous message.
+ This message will never arrive on the output, since it is only used to trigger the previous message. 
+ It is advised to activate *"Force clone"* in the config screen, to avoid strange results when the next nodes in the flow have changed the last msg meanwhile.

An example flow:

![Resend last msg](https://user-images.githubusercontent.com/14224149/102977800-ceb32f00-4503-11eb-9f69-f7aaa026c4b8.png)
```
[{"id":"d0f5ca67.9191e8","type":"msg-resend","z":"42b7b639.325dd8","interval":"1","intervalUnit":"secs","maximum":"4","bytopic":false,"clone":true,"firstDelayed":false,"addCounters":false,"waitForResend":false,"highRate":false,"outputCountField":"","outputMaxField":"","name":"","x":2370,"y":220,"wires":[["b18a381c.2e5bf8"]]},{"id":"6c905f49.c7653","type":"inject","z":"42b7b639.325dd8","name":"someValue","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"someValue","payloadType":"str","x":2100,"y":220,"wires":[["d0f5ca67.9191e8"]]},{"id":"b18a381c.2e5bf8","type":"debug","z":"42b7b639.325dd8","name":"Output","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","statusVal":"","statusType":"auto","x":2530,"y":220,"wires":[]},{"id":"267d86d3.2e31ca","type":"inject","z":"42b7b639.325dd8","name":"Resend last message","props":[{"p":"resend_last_msg","v":"true","vt":"bool"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","x":2140,"y":320,"wires":[["d0f5ca67.9191e8"]]},{"id":"8d5a0592.2802e8","type":"inject","z":"42b7b639.325dd8","name":"anotherValue","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"anotherValue","payloadType":"str","x":2110,"y":260,"wires":[["d0f5ca67.9191e8"]]}]
```

And like all other options, the resending of the last message can also optionally be ***topic dependent***:

![Topic dependent resend last msg](https://user-images.githubusercontent.com/14224149/102977839-db378780-4503-11eb-83d5-df82f36e9448.png)
```
[{"id":"2521d824.9cd678","type":"comment","z":"42b7b639.325dd8","name":"Topic A","info":"","x":2590,"y":660,"wires":[]},{"id":"8acdfc42.25be","type":"msg-resend","z":"42b7b639.325dd8","interval":"1","intervalUnit":"secs","maximum":"4","bytopic":true,"clone":true,"firstDelayed":false,"addCounters":false,"waitForResend":false,"highRate":false,"outputCountField":"","outputMaxField":"","name":"","x":2910,"y":700,"wires":[["b3a115ab.aec4f8"]]},{"id":"ecdde9d2.5b6218","type":"inject","z":"42b7b639.325dd8","name":"someValue","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"TOPIC_A","payload":"someValue","payloadType":"str","x":2600,"y":700,"wires":[["8acdfc42.25be"]]},{"id":"b3a115ab.aec4f8","type":"debug","z":"42b7b639.325dd8","name":"Output","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","statusVal":"","statusType":"auto","x":3070,"y":700,"wires":[]},{"id":"3acd8ba.9c69c74","type":"inject","z":"42b7b639.325dd8","name":"Resend last topic A msg","props":[{"p":"resend_last_msg","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"TOPIC_A","x":2640,"y":740,"wires":[["8acdfc42.25be"]]},{"id":"ffa2c428.0fef28","type":"comment","z":"42b7b639.325dd8","name":"Topic B","info":"","x":2590,"y":800,"wires":[]},{"id":"b00d63c.ebcd6a","type":"inject","z":"42b7b639.325dd8","name":"anotherValue","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"TOPIC_B","payload":"anotherValue","payloadType":"str","x":2610,"y":840,"wires":[["8acdfc42.25be"]]},{"id":"58254d59.b624e4","type":"inject","z":"42b7b639.325dd8","name":"Resend last topic B msg","props":[{"p":"resend_last_msg","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"TOPIC_B","x":2650,"y":880,"wires":[["8acdfc42.25be"]]}]
```
