const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('public'));

app.post('/api/ingest', (req, res) => {
  const { fileName, rawContent, title } = req.body;
  
  console.log("--- NEW LOGISTICS DATA RECEIVED ---");
  console.log("Source File:", fileName);
  console.log("Title Preview:", title);
  
  const responseMessage = {
    status: "Success",
    processed_at: new Date().toISOString(),
    message: `Knowledge Draft for '${title}' created successfully.`
  };

  res.status(201).json(responseMessage);
});

app.listen(3000, () => {
  console.log("DHL Logistics API is now ONLINE.");
});
