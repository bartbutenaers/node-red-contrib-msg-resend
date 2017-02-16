module.exports = function(RED) {
    "use strict";

    function MessageResenderNode(config) {
        RED.nodes.createNode(this,config);
        this.interval = config.interval * 1000; // in milliseconds
        this.maximumCount = config.maximum;
        this.forceClone = config.clone;
        this.timer = 0;
        this.msgCounter = 0;
        this.prevTimestamp = Date.now();

        var node = this;

        if( isNaN(node.interval) ) {
            return this.error("The resend interval is not valid");
        }

        if( isNaN(node.maximumCount) ) {
            return this.error("The maximum count is not valid");
        }

        function sendMsg(msg, node) {
            // There might be no need to clone the message (before sending it to the output).  As soon as multiple wires are
            // connected to the output port, the 'send' method will clone the messages automatically:  The original message
            // will be send to the first wire, and on every other wire a cloned message will be put.  However when the 
            // original message (on the first) wire arrives in a node that changes the content of the message, this msg-resend
            // node will from then on send an UPDATED message!  Then the user should use forceClone...  
            if (node.forceClone) {
                var msgClone = RED.util.cloneMessage(msg);
                node.send(msgClone);
            }
            else {
                node.send(msg);
            }
         
            node.msgCounter++;

            node.status({fill:"green",shape:"dot",text:"sended " + node.msgCounter + "x"});
	}

        this.on('input', function(msg) {
            node.msgCounter = 0;

            // As soon as a message arrives, it will be cloned to the output
            sendMsg(msg, node);

            var msgTimestamp = Date.now();
            
            if((msgTimestamp - node.prevMsgTimestamp) <= node.interval) {
                node.status({fill:"red",shape:"ring",text:"High input rate"});
                return null;
            }

            node.prevMsgTimestamp = msgTimestamp;

            // Check whether another timer has already been started (by this node) previously
            if (node.timer !== 0) {
               // When a timer is already running, stop it (since that timer is still cloning the previous message)
               clearInterval(node.timer);
               node.timer = 0;
            }

            // Start a new timer, that repeatedly sends the new msg to the output
            // (with the specified milliseconds between every two repeats).
            // The timer id will be stored, so it can be found when a new msg arrives at the input.
            node.timer = setInterval(function() {
                node.status({});

                if(node.maximumCount > 0 && node.msgCounter >= node.maximumCount) {
                    // The maximum number of messages has been send, so stop the timer (for the last received input message).
                    clearInterval(node.timer);
                    node.timer = 0;
                    node.status({fill:"green",shape:"dot",text:"maximum reached"});
                }
                else {
                    sendMsg(msg, node);
                }
            }, node.interval); 
        });

        this.on("close", function() {
            if (node.timer) {
                clearInterval(node.timer);
                node.timer = 0;
                node.status({});
            }
        });
    }

    RED.nodes.registerType("msg-resend",MessageResenderNode);
}
