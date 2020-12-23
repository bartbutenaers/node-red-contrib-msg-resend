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
        this.interval         = parseInt(config.interval);
        this.intervalUnit     = config.intervalUnit || "secs";
        this.maximumCount     = parseInt(config.maximum);
        this.forceClone       = config.clone;
        this.firstDelayed     = config.firstDelayed;
        this.byTopic          = config.bytopic;  
        this.addCounters      = config.addCounters;
        this.waitForResend    = config.waitForResend;
        this.highRate         = config.highRate;
        this.outputCountField = (config.outputCountField || '').trim();
        this.outputMaxField   = (config.outputMaxField || '').trim();        
        this.statistics       = new Map();
        this.progress         = '';
        this.displayTimestamp = 0;

        var node = this;

        if( isNaN(node.interval) ) {
            return this.error("The resend interval is not valid");
        }

        if( isNaN(node.maximumCount) ) {
            return this.error("The maximum count is not valid");
        }
        
        // Convert the 'interval' value to milliseconds (based on the selected time unit)
        switch(this.intervalUnit) {
            case "secs":
                this.interval *= 1000;
                break;
            case "mins":
                this.interval *= 1000 * 60;
                break;
            case "hours":
                this.interval *= 1000 * 60 * 60;
                break;            
            default: // "msecs" so no conversion needed
        }

        function sendMsg(msg, node, statistic) {
            var displayText = "";
            var outputMsg = msg;
            
            
            statistic.counter++;
            
            // There might be no need to clone the message (before sending it to the output).  As soon as multiple wires are
            // connected to the output port, the 'send' method will clone the messages automatically:  The original message
            // will be send to the first wire, and on every other wire a cloned message will be put.  However when the 
            // original message (on the first) wire arrives in a node that changes the content of the message, this msg-resend
            // node will from then on send an UPDATED message!  Then the user should use forceClone...  
            if (node.forceClone) {
                outputMsg = RED.util.cloneMessage(msg);
            }
            
            if (node.addCounters) {
                // When the message counter needs to be included in the output message, set it in the specified message field
                if (node.outputCountField !== '') {
                    try {
                        RED.util.setMessageProperty(outputMsg, node.outputCountField, statistic.counter, true);
                    } 
                    catch(err) {
                        node.error("Error setting count in msg." + node.outputCountField + " : " + err.message);
                    }
                }
                
                // When the maximum needs to be included in the output message, set it in the specified message field
                if (node.outputMaxField !== '') {
                    try {
                        RED.util.setMessageProperty(outputMsg, node.outputMaxField, statistic.maximumCount, true);
                    } 
                    catch(err) {
                        node.error("Error setting maximum in msg." + node.outputMaxField + " : " + err.message);
                    }
                } 
            }                
                
            node.send(outputMsg);
                     
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
                displayText = "sent " + statistic.counter + "x";
            }
            
            // Update the node status at a maximum rate of 1 second, to avoid update issues in case of high data rates
            if (Date.now() - node.displayTimestamp > 900 ) {
                node.status({fill:"green",shape:"dot",text: displayText});
                node.displayTimestamp = Date.now();
            }
	    }

        node.on('input', function(msg) {
            // Programmatic control of resending the last message.
            // This is a special case: as soon as resend_last_msg has been specified, we will continue with the last message.
            // Or we won't continue at all, if there is no last message yet.
            if (msg.hasOwnProperty("resend_last_msg")) {
                if (msg.resend_last_msg == true || msg.resend_last_msg == false) {
                    if (msg.resend_last_msg == true) {
                        // When no topic-based resending, store all topics in the map as a single virtual topic (named 'all_topics')
                        var topic = node.byTopic ? msg.topic : "all_topics";
                        var statistic = node.statistics.get(topic);
                        
                        // If no statistic available yet (for that topic), let's create it
                        if (statistic && statistic.message) {
                            // Continue from here with the last message (instead of the current message)
                            msg = statistic.message;
                        }
                        else {
                            this.error("There is no last message to resend", msg);
                            return;
                        }
                    }
                }
                else {
                    this.error("resend_last_msg is not a boolean value", msg);
                    return;
                }
            } 
            
            // When no topic-based resending, store all topics in the map as a single virtual topic (named 'all_topics')
            var topic = node.byTopic ? msg.topic : "all_topics";
            var statistic = node.statistics.get(topic);
            
            // If no statistic available yet (for that topic), let's create it
            if (!statistic) {
                // Use by default the interval, maximumCount and force_clone of the node itself
                statistic = {counter:0, previousTimestamp:0, timer:0, message:null, interval:node.interval, maximumCount:node.maximumCount, forceClone:node.forceClone, resend_messages:!node.waitForResend};
                node.statistics.set(topic, statistic);
            }

            // Programmatic control of resend interval using message parameter (which is stored per topic)
            if (msg.hasOwnProperty("resend_interval")) {
                if (!isNaN(msg.resend_interval) && isFinite(msg.resend_interval)) {
                    // The timer should be restarted when a new resend interval is specified
                    /*if (statistic.interval != msg.resend_interval * 1000) {
                        restartTimer = true;
                    }*/
                    
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
            
            // Programmatic control of the current mode
            if (msg.hasOwnProperty("resend_messages")) {
                if (msg.resend_messages === true || msg.resend_messages === false) {
                    statistic.resend_messages = msg.resend_messages;
                }
                else {
                    this.error("resend_messages is not a boolean value", msg);
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
                    
            // In case of topic-based resending, don't resend messages without topic
            var resendMessage = true;
            if (node.byTopic && !msg.hasOwnProperty("topic")) {
                resendMessage = false;
            }
            
            // Don't resend messages when the messages when resending is deactivated, unless we are forced to resend this message
            if (!statistic.resend_messages && !msg.resend_force) {
                resendMessage = false;
            }
            
            // Programmatic control to resend this msg anyway (overriding the previous settings...)
            if (msg.hasOwnProperty("resend_never")) {
                if (msg.resend_never == true || msg.resend_never == false) {
                    if (msg.resend_never == true) {
                        resendMessage = false;
                    }
                }
                else {
                    this.error("resend_never is not a boolean value", msg);
                }
            }

            if(!ignoreMessage && resendMessage) {                
                var msgTimestamp = Date.now();
                
                if (!node.highRate && statistic.previousTimestamp && (msgTimestamp - statistic.previousTimestamp) <= statistic.interval) {
                    node.error("Message not resend, because message rate too high");
                    node.status({fill:"red",shape:"ring",text:"High input rate"});
                    return null;
                }

                // Start counting again from zero
                statistic.counter = 0;
                
                // User can specify that as soon as a message arrives, it will be sended to the output
                if (!node.firstDelayed) {
                    sendMsg(msg, node, statistic);
                }

                statistic.previousTimestamp = msgTimestamp;
            }
          
            // Check whether another timer has already been started (by this node) previously, for the same topic
            if (statistic && statistic.timer /*&& restartTimer*/) {
               // When a timer is already running (for the specified topic), stop it (since that timer is still cloning the previous message)
               clearInterval(statistic.timer);
               statistic.timer = 0;
            }

            if (!ignoreMessage && resendMessage /*&& !statistic.timer*/) {
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
                        
                        // Reset the calculated values of the statistic, since those are not needed anymore.
                        // Keep the other values unchanged, because they might have been updated via input messages...
                        statistic.counter = 0
                        statistic.previousTimestamp = 0
                        statistic.timer = 0;

                        // Only update the node status if all messages (for all topics) have been resend
                        var runningStatsCount = 0;
                        for (var stat of node.statistics.values()) {
                            if (stat.timer != 0) {
                                runningStatsCount++;
                            }
                        }

                        if (runningStatsCount === 0) {
                            node.status({fill:"green",shape:"dot",text:"maximum reached"});
                        }
                    }
                    else {
                        sendMsg(msg, node, statistic);
                    }
                }, statistic.interval);
            }
            
            // When being in pass-through mode, simply send the message to the output once (unless the msg has been forced to be resend already).
            // Don't send the message when it should be ignored.
            if (!statistic.resend_messages && !msg.resend_force && !ignoreMessage) {
                var outputMsg = msg;
                
                // When "force cloning" is enabled, the messages in pass-through mode should also be cloned!
                // Otherwise we get conflicts when using "msg.resend_last_msg" afterwards on these messages, because the messages might have been changed by other nodes...
                if (node.forceClone) {
                    outputMsg = RED.util.cloneMessage(msg);
                }
                
                node.send(outputMsg);
            }
            
            // Remember the last msg (per topic), except when it should be ignored for output
            if(!ignoreMessage) {
                statistic.message = msg;
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
