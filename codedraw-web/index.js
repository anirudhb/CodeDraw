const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = 3000;

require("util").inspect.defaultOptions.depth = null;

app.use("/", express.static("static"));
app.use(bodyParser.text());

app.post("/jiix2code", (req, res) => {
    let jiix = JSON.parse(req.body);

    function findNode(id) {
        return jiix.elements.filter(x => x.id == id)[0];
    }

    function findEdge(beginNode) {
        // Don't look for rectangles, that is handled in a separate function
        let a = jiix.elements.filter(
            x => x.type == "Edge" && x.connected[0] == beginNode.id && findNode(x.connected[1]).kind != "rectangle");
        return a[0];
    }

    function nodeToText(node) {
        if (!node) return "";
        if (node.label) return findNode(node.label).label;
        for (let childId of node.children) {
            let chn = findNode(childId);
            if (chn.label && (typeof chn.label == "string")) return chn.label;
        }
        return "";
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
            if (x.type != "Edge" || x.connected[0] != beginId) return false;
            let endpoint = findNode(x.connected[1]);
            if (endpoint.type == "Node" && endpoint.kind == "rectangle") return true;
            return false;
        });
        return a[0];
    }

    function findArgParent(arg) {
        let x = nodes.filter(x => x.children && x.children.includes(arg.id))[0];
        if (x) return x;
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
        let arg = findNode(node2rect_edge.connected[1]);
        console.log(arg);
        let parent = findArgParent(arg);
        console.log(nodeToText(parent));
        if (!arg_count.hasOwnProperty(parent)) {
            arg_count[parent] = 0;
        }
        arg_providers.push([n, parent, arg_count[parent]++]);
    }
    console.log(arg_providers);
    for (const [provider, providee, argnum] of arg_providers) {
        console.log(`${nodeToText(provider)} => ${nodeToText(providee)} (#${argnum})`);
    }
    let texts = nodes.map(nodeToText);
    console.log(texts);

    console.log("=====================================================================");

    /* Convert it into code!! */
    function addslashes(str) {
        return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
    }
    let code = "";
    for (let node of nodes) {
        let text = nodeToText(node);
        if (text.toLowerCase().startsWith("ask")) {
            let prompt = text.split("\n")[1];
            code += "let result_" + node.id + "=prompt(\"" + addslashes(prompt) + "\");";
        }
        if (text.toLowerCase().startsWith("add")) {
            let args = arg_providers.filter(([a, b, c]) => b == node).sort((a, b) => a[2] - b[2]);
            let arg_vars = args.map(x => "result_" + x[0].id);
            code += "result_" + node.id + "=";
            for (const i in arg_vars) {
                code += arg_vars[i];
                if (i != arg_vars.length - 1) code += "+";
            }
            code += ";";
        }
        if (text.toLowerCase().startsWith("mul")) {
            let args = arg_providers.filter(([a, b, c]) => b == node).sort((a, b) => a[2] - b[2]);
            let arg_vars = args.map(x => "result_" + x[0].id);
            code += "result_" + node.id + "=";
            for (const i in arg_vars) {
                code += arg_vars[i];
                if (i != arg_vars.length - 1) code += "*";
            }
            code += ";";
        }
        if (text.toLowerCase().startsWith("div")) {
            let args = arg_providers.filter(([a, b, c]) => b == node).sort((a, b) => a[2] - b[2]);
            let arg_vars = args.map(x => "result_" + x[0].id);
            code += "result_" + node.id + "=";
            for (const i in arg_vars) {
                code += arg_vars[i];
                if (i != arg_vars.length - 1) code += "/";
            }
            code += ";";
        }
        if (text.toLowerCase().startsWith("sub")) {
            let args = arg_providers.filter(([a, b, c]) => b == node).sort((a, b) => a[2] - b[2]);
            let arg_vars = args.map(x => "result_" + x[0].id);
            code += "result_" + node.id + "=";
            for (const i in arg_vars) {
                code += arg_vars[i];
                if (i != arg_vars.length - 1) code += "-";
            }
            code += ";";
        }
        if (text.toLowerCase().startsWith("text")) {
            let t = text.split("\n").slice(1).join("\n");
            code += "let result_" + node.id + "=\"" + addslashes(t) + "\";";
        }
        if (text.toLowerCase().startsWith("number") || text.toLowerCase().startsWith("num")) {
            let t = text.split("\n").slice(1).join("");
            code += "let result_" + node.id + "=Number(";
            if (t == "") {
                let arg = arg_providers.find(([a, b, c]) => b == node && c == 0);
                let arg_var = "result_" + arg[0].id;
                code += arg_var + ");";
            } else {
                code += "\"" + addslashes(t) + "\");";
            }
        }
        if (text.toLowerCase().startsWith("say")) {
            let arg = arg_providers.find(([a, b, c]) => b == node && c == 0);
            let arg_var = "result_" + arg[0].id;
            code += "result_" + node.id + "=alert(" + arg_var + ");";
        }
    }

    console.log("Code:");
    console.log(code);

    res.send(JSON.stringify({ code }));
});

app.listen(port, () => console.log(`App listening on port ${port}`));