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

            // Programmatic control of resend interval using message parameter
            if (msg.hasOwnProperty("resend_interval")) {
                if (!isNaN(msg.resend_interval) && isFinite(msg.resend_interval)) {
                    node.interval = msg.resend_interval * 1000; // In milliseconds
                }
                else {
                    this.error("resend_interval is not a numeric value", msg);
                }
            }

            // Programmatic control of max.count using message parameter
            if (msg.hasOwnProperty("resend_max_count")) {
                if (!isNaN(msg.resend_max_count) && isFinite(msg.resend_max_count)) {
                    node.maximumCount = msg.resend_max_count;
                }
                else {
                    this.error("resend_max_count is not a numeric value", msg);
                }
            }

            // Programmatic control of force cloning using message parameter
            if (msg.hasOwnProperty("resend_force_clone")) {
                if (msg.resend_force_clone == true || msg.resend_force_clone == false) {
                    node.forceClone = msg.resend_force_clone;
                }
                else {
                    this.error("resend_force_clone is not a boolean value", msg);
                }
            }

            // Programmatic control to ignore this message from being cloned using message parameter
            var ignoreMessage = false;
            if (msg.hasOwnProperty("resend_ignore")) {
                if (msg.resend_ignore == true || msg.resend_ignore == false) {
                    ignoreMessage = msg.resend_ignore;
                }
                else {
                    this.error("resend_ignore is not a boolean value", msg);
                }
            }
            
            if(!ignoreMessage) {
                // As soon as a message arrives, it will be cloned to the output
                sendMsg(msg, node);

                var msgTimestamp = Date.now();
            
                if ((msgTimestamp - node.prevMsgTimestamp) <= node.interval) {
                    node.status({fill:"red",shape:"ring",text:"High input rate"});
                    return null;
                }

                node.prevMsgTimestamp = msgTimestamp;
            }

            // Check whether another timer has already been started (by this node) previously
            if (node.timer !== 0) {
               // When a timer is already running, stop it (since that timer is still cloning the previous message)
               clearInterval(node.timer);
               node.timer = 0;
            }

            if (!ignoreMessage) {
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
            } 
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
