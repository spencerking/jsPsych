/* jspsych-palmer
 * a jspsych plugin for presenting and querying about stimuli modeled after
 *
 * Palmer, S. (1977). Hierarchical Structure in Perceptual Representation. Cognitive Psychology, 9, 441.
 *
 * and
 *
 * Goldstone, R. L., Rogosky, B. J., Pevtzow, R., & Blair, M. (2005). Perceptual and semantic reorganization during category learning. 
 * In H. Cohen & C. Lefebvre (Eds.) Handbook of Categorization in Cognitive Science. (pp. 651-678). Amsterdam: Elsevier.
 *
 * Josh de Leeuw (October 2013)
 *
 * NOTE: This plugin requires the Raphaeljs library for manipulating vector graphics (SVG). Download at http://www.raphaeljs.com
 *
 */

(function($) {
    jsPsych.palmer = (function() {

        var plugin = {};

        plugin.create = function(params) {
            var trials = [];
            for (var i = 0; i < params.configurations.length; i++) {
                var trial = {
                    type: "palmer",
                    configurations: params.configurations[i],
                    editable: params.editable,
                    grid_spacing: params.grid_spacing || 75,
                    square_size: params.square_size || 3,
                    circle_radius: params.circle_radius || 20,
                    timing_item: params.timing_item || 1000,
                    timing_post_trial: params.timing_post_trial || 1000
                };
                
                if(params.data !== undefined)
                {
                    $.extend({},trial,{data:params.data[i]});
                }
                
                trials.push(trial);
            }
            return trials;
        };
        
        plugin.trial = function(display_element, block, trial, part) {

            // variables to keep track of user interaction
            var start_circle = -1;
            var end_circle = -1;
            var line_started = false;

            var size = trial.grid_spacing * (trial.square_size + 1);

            display_element.append($("<div id='raphaelCanvas'>", {
                css: {
                    width: size + "px",
                    height: size + "px"
                }
            }));

            var paper = Raphael("raphaelCanvas", size, size);

            // create the circles at the vertices.
            var circles = [];
            var node_idx = 0;
            for (var i = 1; i <= trial.square_size; i++) {
                for (var j = 1; j <= trial.square_size; j++) {
                    var circle = paper.circle(trial.grid_spacing * j, trial.grid_spacing * i, trial.circle_radius);
                    circle.attr("fill", "#000").attr("stroke-width", "0").attr("stroke", "#000").data("node", node_idx);

                    if (trial.editable) {
                        circle.hover(

                        function() {
                            this.attr("stroke-width", "2");
                            //this.attr("stroke", "#000");
                        },

                        function() {
                            this.attr("stroke-width", "0");
                            //this.attr("stroke", "#fff")
                        }).click(

                        function() {
                            if (!line_started) {
                                line_started = true;
                                start_circle = this.data("node");
                                this.attr("fill", "#777").attr("stroke", "#777");
                            }
                            else {
                                end_circle = this.data("node");
                                draw_connection(start_circle, end_circle);
                            }
                        });
                    }
                    node_idx++;
                    circles.push(circle);
                }
            }

            function draw_connection(start_circle, end_circle) {
                var the_line = getLineIndex(start_circle, end_circle);
                if (the_line > -1) {
                    toggle_line(the_line);
                }
                // reset highlighting on circles
                for (var i = 0; i < circles.length; i++) {
                    circles[i].attr("fill", "#000").attr("stroke", "#000");
                }
                // cleanup the variables
                line_started = false;
                start_circle = -1;
                end_circle = -1;
            }

            // create all possible lines that connect circles
            var horizontal_lines = [];
            var vertical_lines = [];
            var backslash_lines = [];
            var forwardslash_lines = [];

            for (var i = 0; i < trial.square_size; i++) {
                for (var j = 0; j < trial.square_size; j++) {
                    var current_item = (i * trial.square_size) + j;
                    // add horizontal connections
                    if (j < (trial.square_size - 1)) {
                        horizontal_lines.push([current_item, current_item + 1]);
                    }
                    // add vertical connections
                    if (i < (trial.square_size - 1)) {
                        vertical_lines.push([current_item, current_item + trial.square_size]);
                    }
                    // add diagonal backslash connections
                    if (i < (trial.square_size - 1) && j < (trial.square_size - 1)) {
                        backslash_lines.push([current_item, current_item + trial.square_size + 1]);
                    }
                    // add diagonal forwardslash connections
                    if (i < (trial.square_size - 1) && j > 0) {
                        forwardslash_lines.push([current_item, current_item + trial.square_size - 1]);
                    }
                }
            }

            var lines = horizontal_lines.concat(vertical_lines).concat(backslash_lines).concat(forwardslash_lines);

            // actually draw the lines
            var lineIsVisible = [];
            var lineElements = [];

            for (var i = 0; i < lines.length; i++) {
                var line = paper.path("M" + circles[lines[i][0]].attr("cx") + " " + circles[lines[i][0]].attr("cy") + "L" + circles[lines[i][1]].attr("cx") + " " + circles[lines[i][1]].attr("cy")).attr("stroke-width", "8").attr("stroke", "#000");
                line.hide();
                lineElements.push(line);
                lineIsVisible.push(0);
            }

            // define some helper functions to toggle lines on and off

            // this function gets the index of a line based on the two circles it connects
            function getLineIndex(start_circle, end_circle) {
                var the_line = -1;
                for (var i = 0; i < lines.length; i++) {
                    if ((start_circle == lines[i][0] && end_circle == lines[i][1]) || (start_circle == lines[i][1] && end_circle == lines[i][0])) {
                        the_line = i;
                        break;
                    }
                }
                return the_line;
            }

            // this function turns a line on/off based on the index (the_line)
            function toggle_line(the_line) {
                if (the_line > -1) {
                    if (lineIsVisible[the_line] === 0) {
                        lineElements[the_line].show();
                        lineElements[the_line].toBack();
                        lineIsVisible[the_line] = 1;
                    }
                    else {
                        lineElements[the_line].hide();
                        lineElements[the_line].toBack();
                        lineIsVisible[the_line] = 0;
                    }
                }
            }

            // this function takes an array of length = num lines, and displays the line whereever there
            // is a 1 in the array.
            function showConfiguration(configuration) {
                for (var i = 0; i < configuration.length; i++) {
                    if (configuration[i] == 1) {
                        toggle_line(i);
                    }
                }
            }

            // start recording the time
            var startTime = (new Date()).getTime();

            // what kind of trial are we doing?
            // if trial.editable is true, then we will let the user interact with the stimulus to create
            // something, e.g. for a reconstruction probe.
            // need a way for the user to submit when they are done in that case...
            if (trial.editable) {
                display_element.append($('<button id="submitButton" type="button">Submit Answer</button>'));
                $('#submitButton').click(function() {
                    save_data();
                });
            }

            // if trial.editable is false, then we are just showing a pre-determined configuration.
            // for now, the only option will be to display for a fixed amount of time.
            // future ideas: allow for key response, to enable things like n-back, same/different, etc..
            if (!trial.editable) {
                showConfiguration(trial.configurations);
                setTimeout(function() {
                    save_data();
                }, trial.timing_item);
            }

            function arrayEqual(arr1, arr2) {
                for (var i = 0; i < arr1.length; i++) {
                    if (arr1[i] != arr2[i]) {
                        return false;
                    }
                }
                return true;
            }

            // save data
            function save_data() {

                // measure RT
                var endTime = (new Date()).getTime();
                var response_time = endTime - startTime;

                // check if configuration is correct
                // this is meaningless for trials where the user can't edit
                var correct = arrayEqual(trial.configurations, lineIsVisible);

                block.data[block.trial_idx] = $.extend({}, {
                    "trial_type": "palmer",
                    "trial_index": block.trial_idx,
                    "configuration": lineIsVisible,
                    "rt": response_time,
                    "correct": correct
                }, trial.data);

                display_element.html('');

                // next trial
                setTimeout(function() {
                    block.next();
                }, trial.timing_post_trial);
            }


        };

        return plugin;
    })();
})(jQuery);