const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = 3000;

require("util").inspect.defaultOptions.depth = null;

app.use("/", express.static("static"));
app.use(bodyParser.text());

app.post("/jiix2code", (req, res) => {
    let jiix = JSON.parse(req.body);
    console.log(jiix);

    function findNode(id) {
        return jiix.elements.filter(x => x.id == id)[0];
    }

    function findEdge(beginNode) {
        // Don't look for rectangles, that is handled in a separate function
        let a = jiix.elements.filter(
            x => x.type == "Edge" && x.connected[0] == beginNode.id && findNode(x.connected[1]).kind != "rectangle");
        return a[0];
    }
    /**
     * Sort the nodes by id ascending so that they can be placed in an order
     * for the resulting code.
     */
    let firstNode = jiix.elements.filter(x => x.type == "Node").sort((a, b) => a.id - b.id)[0];
    let nodes = [firstNode];
    let edge = findEdge(firstNode);
    while (edge) {
        nodes.push(findNode(edge.connected[1]));
        edge = findEdge(nodes[nodes.length - 1]);
    }
    console.log(nodes);
    /**
     * Look for edges that connect from a node to a rectangle.
     * These are providing arguments.
     */
    let found_edges = [];
    let arg_count = {};
    let arg_providers = [];
    let node2rect_edge = true;

    function findArgEdge(begin_node) {
        let beginId = begin_node.id;
        let a = jiix.elements.filter(x => {
            if (x.type != "Edge" || x.connected[1] != beginId) return false;
            let endpoint = findNode(x.connected[0]);
            if (endpoint.type == "Node" && endpoint.kind == "rectangle") return true;
            return false;
        });
        return a[0];
    }

    function findArgParent(arg) {
        for (let node of nodes) {
            let isParent = false;
            // dispatch based on type of node
            switch (node.kind) {
                case "circle":
                    function pic(n, x, y) {
                        return (x - n.cx) ** 2 + (y - n.cy) ** 2 <= n.r;
                    }
                case "ellipse":
                    function pic(n, x, y) {
                        return ((x - n.cx) ** 2 / n.rx) + ((y - n.cy) ** 2 / n.ry) <= 1;
                    }
            }
            let p0c = pic(node, arg.x, arg.y),
                p1c = pic(node, arg.x + arg.width, arg.y),
                p2c = pic(node, arg.x, arg.y + arg.height),
                p3c = pic(node, arg.x + arg.width, arg.y + arg.height);
            let ip = !p0c && !p1c && !p2c && !p3c;
            if (ip) return node;
        }
        return null;
    }
    while (node2rect_edge) {
        let found = false;
        let n = null;
        for (let node of nodes) {
            let e = findArgEdge(node);
            if (e && !found_edges.includes(e)) {
                found = true;
                node2rect_edge = e;
                n = node;
                break;
            }
        }
        if (!found) {
            node2rect_edge = null;
            continue;
        }
        found_edges.push(node2rect_edge);
        let arg = findNode(node2rect_edge.connected[0]);
        let parent = findArgParent(arg);
        console.log(findNode(parent.label).label);
        if (!arg_count.hasOwnProperty(parent)) {
            arg_count[parent] = 0;
        }
        arg_providers.push([n, parent, arg_count[parent]++]);
    }
    console.log(arg_providers);
    for (const [provider, providee, argnum] of arg_providers) {
        console.log(`${findNode(provider.label).label} => ${findNode(providee.label).label} (#${argnum})`);
    }
    let texts = nodes.map(x => findNode(x.label).label);
    console.log(texts);
    res.send("{}");
});

app.listen(port, () => console.log(`App listening on port ${port}`));