/*
A lightweight factory for making d3 heatmaps.
*/
import * as d3 from "d3";

export function simpleHeatmap(data, m_scale, m_width, m_height, m_id, m_x, m_y) {
    var x = m_x ? m_x : 0,
        y = m_y ? m_y : 0,
        width = m_width ? m_width : 0,
        height = m_height ? m_height : 0,
        scale = m_scale ? m_scale : function () { return "#fff"; },
        id = m_id,
        w,
        h;

    function heatmap(nel) {
        heatmap.el = nel;
        heatmap.setProperties();
    }

    heatmap.setProperties = function () {
        if (!this.el) {
            return;
        }

        if (!heatmap.svgGroup) {
            heatmap.svgGroup = heatmap.el.append("g");
        }

        heatmap.svgGroup.attr("transform", "translate(" + x + "," + y + ")");

        heatmap.svgGroup
            .selectAll("g")
            .data(data)
            .enter()
            .append("g")
            .selectAll("rect")
            .data(function (d, i) {
                return d.map(function (val) {
                    return { r: i, v: val };
                });
            })
            .enter()
            .append("rect")
            .datum(function (d, i) {
                d.c = i;
                return d;
            });

        heatmap.svgGroup
            .selectAll("g")
            .selectAll("rect")
            .attr("x", function (d) {
                return width / data[d.r].length * d.c;
            })
            .attr("y", function (d) {
                return d.r * h;
            })
            .attr("width", function (d) {
                return width / data[d.r].length;
            })
            .attr("height", h)
            .attr("fill", function (d) {
                return scale(d.v);
            });

        if (id) {
            heatmap.svgGroup.attr("id", id);
        }
    };

    heatmap.data = function (newData) {
        if (!arguments.length) {
            return data;
        } else {
            data = newData;
            h = width / data.length;
            heatmap.setProperties();
            return heatmap;
        }
    };

    heatmap.x = function (newX) {
        if (!arguments.length) {
            return x;
        } else {
            x = newX;
            heatmap.setProperties();
            return heatmap;
        }
    };

    heatmap.y = function (newY) {
        if (!arguments.length) {
            return y;
        } else {
            y = newY;
            heatmap.setProperties();
            return heatmap;
        }
    };

    heatmap.width = function (newWidth) {
        if (!arguments.length) {
            return width;
        } else {
            width = newWidth;
            if (data) {
                w = newWidth / data.length;
                heatmap.setProperties();
            }
            return heatmap;
        }
    };

    heatmap.height = function (newHeight) {
        if (!arguments.length) {
            return height;
        } else {
            height = newHeight;
            if (data) {
                h = newHeight / data.length;
                heatmap.setProperties();
            }
            return heatmap;
        }
    };

    heatmap.scale = function (newScale) {
        if (!arguments.length) {
            return scale;
        } else {
            scale = newScale;
            if (data) {
                heatmap.setProperties();
            }
            return heatmap;
        }
    };

    heatmap.id = function (newId) {
        if (!arguments.length) {
            return id;
        } else {
            id = newId;
            heatmap.setProperties();
            return heatmap;
        }
    };

    return heatmap;
}
