// backend/index.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const prisma = require("./lib/prisma");
const { generateEmbedding } = require("./services/gemini");

const app = express();
app.use(cors()); // Allows our React frontend to call the API
app.use(express.json()); // Allows us to read JSON from request bodies

// --- API Endpoints ---

// GET: Fetch all bookmarks (for initial display)
app.get("/bookmarks", async (req, res) => {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      select: {
        id: true,
        url: true,
        title: true,
        content: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.json(bookmarks);
  } catch (error) {
    console.error("Failed to fetch bookmarks:", error);
    res.status(500).json({ error: "Failed to fetch bookmarks." });
  }
});

// POST: Add a new bookmark
app.post("/bookmarks", async (req, res) => {
  const { url, title, content } = req.body;
  console.log("body", req.body);
  if (!url || !content) {
    return res.status(400).json({ error: "URL and content are required." });
  }

  try {
    console.log("Generating embedding for:", content);
    const embedding = await generateEmbedding(content);
    console.log("Embedding generated successfully.");
    //     console.log("embeddings please", embedding);

    // We use a raw query because Prisma doesn't natively support the VECTOR type.
    // JSON_ARRAY_PACK is a SingleStore function to efficiently store the vector.
    await prisma.$executeRaw`
      INSERT INTO bookmarks (url, title, content, embedding)
      VALUES (${url}, ${title}, ${content}, JSON_ARRAY_PACK(${JSON.stringify(
      embedding
    )}))
    `;

    console.log("Bookmark saved to database.");
    res
      .status(201)
      .json({ message: "Bookmark added successfully!", data: embedding });
  } catch (error) {
    console.error("Failed to add bookmark:", error);
    res.status(500).json({ error: "Failed to add bookmark." });
  }
});

// POST: Search for bookmarks
app.post("/search", async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Search query is required." });
  }

  try {
    console.log("Generating embedding for search query:", query);
    const queryEmbedding = await generateEmbedding(query);
    console.log("Search embedding generated.");

    const SIMILARITY_THRESHOLD = 0.7;

    // We use a raw query to leverage SingleStore's DOT_PRODUCT function for vector search.
    const results = await prisma.$queryRaw`
      SELECT 
        id, 
        url, 
        title, 
        content, 
        DOT_PRODUCT(embedding, JSON_ARRAY_PACK(${JSON.stringify(
          queryEmbedding
        )})) as similarity
      FROM bookmarks
      WHERE DOT_PRODUCT(embedding, JSON_ARRAY_PACK(${JSON.stringify(
        queryEmbedding
      )})) > ${SIMILARITY_THRESHOLD}
      ORDER BY similarity DESC
      LIMIT 5
    `;

    console.log("Search complete. Found results:", results.length);
    const processedResults = results.map((item) => ({
      ...item,
      id: Number(item.id), // Convert the BigInt to a regular Number
    }));

    // Step 4: Send the processed results back to the client
    res.json(processedResults);
  } catch (error) {
    console.error("Search failed:", error);
    res.status(500).json({ error: "Search failed." });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log("Ready to accept requests!");
});
