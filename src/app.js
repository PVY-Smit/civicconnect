import express from "express";

const app = express();
app.use(express.json());

// NFR-003s availability measurement needs a health endpoint to probe.
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;
