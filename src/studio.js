const express = require("express");
const router = express.Router();

router.post("/upload", async (req, res) => {
  const { artist_email, artist_name, artwork_title, img_url, tags } = req.body;
  const artworksCollection = req.app.locals.database.collection("artworks");
  await artworksCollection.updateOne(
    {
      artist_email,
      artwork_title: artwork_title
    },
    {
      artist_email,
      artist_name,
      artwork_title,
      img_url,
      $push: { tags: { $each: tags } }
    },
    { upsert: true }
  );
});
export default router;
