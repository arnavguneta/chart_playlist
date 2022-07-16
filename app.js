const axios = require('axios');
const url = require('url');
const fs = require('fs');
const path = require('path');
const d3 = require('d3');
const jsdom = require("jsdom");
const JSDOM = jsdom.JSDOM;

const chartWidth = 1200;
const chartHeight = 1000;
const chartMargin = 200;

var radius = Math.min(chartWidth, chartHeight) / 2 - chartMargin

// const arc = d3.arc()
//     .outerRadius(chartWidth / 2 - 10)
//     .innerRadius(0);

const colours = ["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"];
let playlist_data = []
let artists = {}
const fetch_url = "https://www.googleapis.com/youtube/v3/playlistItems"
let payload = {
    playlistId: 'PLg-uzE8kyhptAXe3rCxE7sYCSdBTM5-S5',
    key: process.env.API_KEY,
    maxResults: 50,
    part: 'snippet'
};

const fetch_data = async () => {
    let res = await axios.get(`${fetch_url}?${new url.URLSearchParams(payload)}`)
    playlist_data.push(...res.data.items)
    while (res.data.nextPageToken) {
        payload.pageToken = res.data.nextPageToken
        res = await axios.get(`${fetch_url}?${new url.URLSearchParams(payload)}`)
        playlist_data.push(...res.data.items)
    }
}

function go(
    pieData = [12, 31],
    outputLocation = path.join(__dirname, './test.svg')
) {
    const dom = new JSDOM("");

    dom.window.d3 = d3.select(dom.window.document); //get d3 into the dom

    //do yr normal d3 stuff
    const svg = dom.window.d3.select('body')
        .append('div').attr('class', 'container') //make a container div to ease the saving process
        .append('svg')
        .attr("xmlns", 'http://www.w3.org/2000/svg')
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .append('g')
        .attr('transform', 'translate(' + chartWidth / 2 + ',' + chartWidth / 2 + ')');

    // set the color scale
    var color = d3.scaleOrdinal()
        .domain(Object.keys(pieData))
        .range(d3.schemeCategory10);

    let pie = d3.pie()
        .sort(null) // Do not sort group by size
        .value(function (d) { return d.value; })
    let data_ready = pie(d3.entries(pieData)).sort(function(a, b){ return d3.ascending(a.values, b.values); })

    // The arc generator
    var arc = d3.arc()
        .innerRadius(radius * 0.5)         // This is the size of the donut hole
        .outerRadius(radius * 0.8)

    // Another arc that won't be drawn. Just for labels positioning
    var outerArc = d3.arc()
        .innerRadius(radius * 0.9)
        .outerRadius(radius * 0.9)

    svg.selectAll('.arc')
        .data(data_ready)
        .enter()
        .append('path')
        .attr("class", 'arc')
        .attr("d", arc)
        .attr("fill", function (d) { return (color(d.data.key)) })
        .attr("stroke", '#fff')

    // Add the polylines between chart and labels:
    svg
        .selectAll('allPolylines')
        .data(data_ready)
        .enter()
        .append('polyline')
        .attr("stroke", "black")
        .style("fill", "none")
        .attr("stroke-width", 1)
        .attr('points', function (d) {
            var posA = arc.centroid(d) // line insertion in the slice
            var posB = outerArc.centroid(d) // line break: we use the other arc generator that has been built only for that
            var posC = outerArc.centroid(d); // Label position = almost the same as posB
            var midangle = d.startAngle + (d.endAngle - d.startAngle) / 2 // we need the angle to see if the X position will be at the extreme right or extreme left
            posC[0] = radius * 0.95 * (midangle < Math.PI ? 1 : -1); // multiply by 1 or -1 to put it on the right or on the left
            return [posA, posB, posC]
        })

    // Add the polylines between chart and labels:
    svg
        .selectAll('allLabels')
        .data(data_ready)
        .enter()
        .append('text')
        .text(function (d) { console.log(d.data.key); return d.data.key })
        .attr('transform', function (d) {
            var pos = outerArc.centroid(d);
            var midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
            pos[0] = radius * 0.99 * (midangle < Math.PI ? 1 : -1);
            return 'translate(' + pos + ')';
        })
        .style('text-anchor', function (d) {
            var midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
            return (midangle < Math.PI ? 'start' : 'end')
        })

    //using sync to keep the code simple
    fs.writeFileSync(outputLocation, dom.window.d3.select('.container').html())
}



fetch_data().then(() => {
    for (const video of playlist_data) {
        const artist = video.snippet.videoOwnerChannelTitle
        const count = artists[artist]
        artists[artist] = (count) ? count + 1 : 1
    }
    // artists = Object.keys(artists).sort(function(a, b) {
    //     return artists[b] - artists[a];
    // })
    go(artists)
    console.log(artists)
})

