/**
 * Copyright 2017 Bart Butenaers
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
 
 module.exports = function(RED) {
    "use strict";

    function MessageResenderNode(config) {
        RED.nodes.createNode(this,config);
        this.interval = config.interval * 1000; // in milliseconds
        this.maximumCount = config.maximum;
        this.forceClone = config.clone;
        this.byTopic = config.bytopic;   
        this.statistics = new Map();
        this.progress = '';
        this.displayTimestamp = 0;

        var node = this;

        if( isNaN(node.interval) ) {
            return this.error("The resend interval is not valid");
        }

        if( isNaN(node.maximumCount) ) {
            return this.error("The maximum count is not valid");
        }

        function sendMsg(msg, node, statistic) {
            var displayText = "";
            
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
         
            statistic.counter++;

            if (node.byTopic) {
                // Show different status text for topic-based resending, simulating a progress bar...
                // (See https://github.com/bartbutenaers/node-red-contrib-msg-resend/issues/2 )
                node.progress += '.';
                if (node.progress.length > 5) {
                    node.progress = '';
                }
                
                displayText = "Resending " + node.progress;
            }
            else {
                displayText = "sended " + statistic.counter + "x";
            }
            
            // Update the node status at a maximum rate of 1 second, to avoid update issues in case of high data rates
            if (Date.now() - node.displayTimestamp > 900 ) {
                node.status({fill:"green",shape:"dot",text: displayText});
                node.displayTimestamp = Date.now();
            }
	    }

        node.on('input', function(msg) {
            // When no topic-based resending, store all topics in the map as a single virtual topic (named 'all_topics')
            var topic = node.byTopic ? msg.topic : "all_topics";
            var statistic = node.statistics.get(topic);
            
            // If no statistic available yet (for that topic), let's create it
            if (!statistic) {
                // Use by default the interval, maximumCount and force_clone of the node itself
                statistic = {counter:0, previousTimestamp:0, timer:0, message:msg, interval:node.interval, maximumCount:node.maximumCount, forceClone:node.forceClone};
                node.statistics.set(topic, statistic);
            }

            // Programmatic control of resend interval using message parameter (which is stored per topic)
            if (msg.hasOwnProperty("resend_interval")) {
                if (!isNaN(msg.resend_interval) && isFinite(msg.resend_interval)) {
                    statistic.interval = msg.resend_interval * 1000; // In milliseconds
                }
                else {
                    this.error("resend_interval is not a numeric value", msg);
                }
            }

            // Programmatic control of max.count using message parameter (which is stored per topic)
            if (msg.hasOwnProperty("resend_max_count")) {
                if (!isNaN(msg.resend_max_count) && isFinite(msg.resend_max_count)) {
                    statistic.maximumCount = msg.resend_max_count;
                }
                else {
                    this.error("resend_max_count is not a numeric value", msg);
                }
            }

            // Programmatic control of force cloning using message parameter (which is stored per topic)
            if (msg.hasOwnProperty("resend_force_clone")) {
                if (msg.resend_force_clone == true || msg.resend_force_clone == false) {
                    statistic.forceClone = msg.resend_force_clone;
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
            
            // Programmatic control of activating resending by topic
            if (msg.hasOwnProperty("resend_by_topic")) {
                if (msg.resend_by_topic == true || msg.resend_by_topic == false) {
                    node.byTopic = msg.resend_by_topic;
                }
                else {
                    this.error("resend_by_topic is not a boolean value", msg);
                }
            }
                        
            // In case of topic-based resending, skip messages without topic
            if (node.byTopic && !msg.hasOwnProperty("topic")) {
                ignoreMessage = true;
            }

            if(!ignoreMessage) {
                // Start counting again from zero
                statistic.counter = 0;
            
                // As soon as a message arrives, it will be sended to the output
                sendMsg(msg, node, statistic);

                var msgTimestamp = Date.now();
            
                if ((msgTimestamp - statistic.previousTimestamp) <= statistic.interval) {
                    node.status({fill:"red",shape:"ring",text:"High input rate"});
                    return null;
                }

                statistic.previousTimestamp = msgTimestamp;
            }
          
            // Check whether another timer has already been started (by this node) previously, for the same topic
            if (statistic && statistic.timer) {
               // When a timer is already running (for the specified topic), stop it (since that timer is still cloning the previous message)
               clearInterval(statistic.timer);
               statistic.timer = 0;
            }

            if (!ignoreMessage) {
                // Start a new timer, that repeatedly sends the new msg to the output
                // (with the specified milliseconds between every two repeats).
                // The timer id will be stored, so it can be found when a new msg arrives at the input.
                statistic.timer = setInterval(function() {
                    if (Date.now() - node.displayTimestamp > 500 ) {
                        node.status({});
                    }
                    
                    if(statistic.maximumCount > 0 && statistic.counter >= statistic.maximumCount) {
                        // The maximum number of messages has been send, so stop the timer (for the last received input message).
                        clearInterval(statistic.timer);
                        
                        // Remove the statistic, since it is not needed anymore
                        node.statistics.delete(topic);
                        
                        // Only update the node status if all messages (for all topics) have been resend
                        if (node.statistics.size == 0) {
                            node.status({fill:"green",shape:"dot",text:"maximum reached"});
                        }
                    }
                    else {
                        sendMsg(msg, node, statistic);
                    }
                }, statistic.interval);
            } 
        });

        node.on("close", function() {
            for(var statistic of node.statistics.values()) {
                clearInterval(statistic.timer);
            }
            node.statistics.clear();
            node.status({});
        });
    }

    RED.nodes.registerType("msg-resend",MessageResenderNode);
}
