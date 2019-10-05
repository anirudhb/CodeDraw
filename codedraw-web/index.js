const express = require("express");
const app = express();
const port = 3000;

app.use("/", express.static("static"));

app.post("/jiix2code", (req, res) => {

});

app.listen(port, () => console.log(`App listening on port ${port}`));