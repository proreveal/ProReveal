/*
  A lightweight factory for making legends.
*/
import * as d3 from "d3";

import { simpleHeatmap, simpleArcmap } from "./heatmap";

export function heatmapLegend(
    m_scale,
    m_width,
    m_height,
    m_format,
    m_utitle,
    m_vtitle,
    m_x,
    m_y
) {
    var el = null,
        utitle = m_utitle ? m_utitle : "Uncertainty",
        vtitle = m_vtitle ? m_vtitle : "Value",
        scale = m_scale ? m_scale : null,
        width = m_width ? m_width : 200,
        height = m_height ? m_height : 200,
        fmat = m_format || null,
        x = m_x ? m_x : 0,
        y = m_y ? m_y : 0,
        data = null;

    var heatmap = simpleHeatmap();

    var legend = function (nel) {
        el = nel;
        legend.setProperties();

        el.call(heatmap);
    };

    legend.setProperties = function () {
        if (!el) {
            return;
        }

        var tmp = data;
        if (!tmp) {
            tmp = scale.quantize().data();
        }

        var inverted = [];
        for (var i = 0; i < tmp.length; i++) {
            inverted[i] = tmp[tmp.length - i - 1];
        }

        heatmap.y(1); // don't hide x-axis
        heatmap.data(inverted);
        heatmap.scale(scale);
        heatmap.width(width).height(height);

        el
            .attr("class", "legend")
            .attr("transform", "translate(" + x + "," + y + ")");

        var uncertaintyDomain =
            scale && scale.quantize ? scale.quantize().uncertaintyDomain() : [0, 1];
        var uStep = (uncertaintyDomain[1] - uncertaintyDomain[0]) / inverted.length;
        var uDom = d3.range(
            uncertaintyDomain[0],
            uncertaintyDomain[1] + uStep,
            uStep
        );

        var valueDomain =
            scale && scale.quantize ? scale.quantize().valueDomain() : [0, 1];
        var vStep = (valueDomain[1] - valueDomain[0]) / inverted.length;
        var vDom = d3.range(valueDomain[0], valueDomain[1] + vStep, vStep);

        var xAxisScale = d3
            .scalePoint()
            .range([0, width])
            .domain(vDom);

        el
            .append("g")
            .call(d3.axisTop(xAxisScale).tickFormat(d3.format(fmat || "")));

        el
            .append("text")
            .style("text-anchor", "middle")
            .style("font-size", 13)
            .attr("transform", "translate(" + width / 2 + ", " + -25 + ")")
            .text(vtitle);

        var yAxis = d3
            .scalePoint()
            .range([0, height])
            .domain(uDom);

        el
            .append("g")
            .attr("transform", "translate(" + width + ", 0)")
            .call(d3.axisRight(yAxis).tickFormat(d3.format(fmat || "")));

        el
            .append("text")
            .style("text-anchor", "middle")
            .style("font-size", 13)
            .attr(
                "transform",
                "translate(" + (width + 40) + ", " + height / 2 + ")rotate(90)"
            )
            .text(utitle);
    };

    legend.data = function (newData) {
        if (!arguments.length) {
            return data;
        } else {
            data = newData;
            legend.setProperties();
            return legend;
        }
    };

    legend.scale = function (s) {
        if (!arguments.length) {
            return scale;
        } else {
            scale = s;
            legend.setProperties();
            return legend;
        }
    };

    legend.width = function (s) {
        if (!arguments.length) {
            return width;
        } else {
            width = s;
            legend.setProperties();
            return legend;
        }
    };

    legend.height = function (s) {
        if (!arguments.length) {
            return height;
        } else {
            height = s;
            legend.setProperties();
            return legend;
        }
    };

    legend.format = function (f) {
        if (!arguments.length) {
            return fmat;
        } else {
            fmat = f;
            legend.setProperties();
            return legend;
        }
    };

    legend.x = function (nx) {
        if (!arguments.length) {
            return x;
        } else {
            x = nx;
            legend.setProperties();
            return legend;
        }
    };

    legend.y = function (ny) {
        if (!arguments.length) {
            return y;
        } else {
            y = ny;
            legend.setProperties();
            return legend;
        }
    };

    legend.utitle = function (t) {
        if (!arguments.length) {
            return utitle;
        } else {
            utitle = t;
            legend.setProperties();
            return legend;
        }
    };

    legend.vtitle = function (t) {
        if (!arguments.length) {
            return vtitle;
        } else {
            vtitle = t;
            legend.setProperties();
            return legend;
        }
    };

    return legend;
}
