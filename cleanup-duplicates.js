// const mongoose = require("mongoose");
// require("dotenv").config();

// async function cleanupDuplicates() {
//   console.log("Connecting to MongoDB...");
//   await mongoose.connect(process.env.MONGO_URI);
//   console.log("Connected!");

//   const db = mongoose.connection.db;
//   const collection = db.collection("attendances");

//   // Find all duplicate user/date combinations
//   const pipeline = [
//     {
//       $group: {
//         _id: { u: "$u", d: "$d" },
//         count: { $sum: 1 },
//         docs: { $push: "$$ROOT" },
//       },
//     },
//     {
//       $match: { count: { $gt: 1 } },
//     },
//   ];

//   const duplicates = await collection.aggregate(pipeline).toArray();
//   console.log(`Found ${duplicates.length} days with duplicate records`);

//   for (const group of duplicates) {
//     const docs = group.docs.sort((a, b) => {
//       return new Date(a.ci || a.d) - new Date(b.ci || b.d);
//     });

//     // Keep the first record (earliest check-in)
//     const keep = { ...docs[0] };
//     delete keep._id; // Let MongoDB assign new ID

//     // If first record has no check-out, get it from the last record
//     if (!keep.co && docs.length > 1) {
//       const lastRecord = docs[docs.length - 1];
//       if (lastRecord.co) {
//         keep.co = lastRecord.co;
//         keep.el = lastRecord.el || false;
//         if (keep.ci && keep.co) {
//           keep.wm = Math.round((new Date(keep.co) - new Date(keep.ci)) / 60000);
//         }
//       }
//     }

//     // Delete all duplicates for this user/date
//     await collection.deleteMany({ u: group._id.u, d: group._id.d });

//     // Insert the cleaned single record
//     await collection.insertOne(keep);

//     console.log(
//       `✅ Cleaned: User ${group._id.u}, Date: ${group._id.d.toISOString().slice(0, 10)}`,
//     );
//   }

//   console.log("\n✨ Cleanup complete!");
//   await mongoose.disconnect();
//   process.exit(0);
// }

// cleanupDuplicates().catch((err) => {
//   console.error("Cleanup failed:", err);
//   process.exit(1);
// });
// cleanup-duplicates.js
const mongoose = require("mongoose");
require("dotenv").config();

async function cleanupDuplicates() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected!");

  const db = mongoose.connection.db;
  const collection = db.collection("attendances");

  // Find duplicates by user + Nepali date (nd field)
  const pipeline = [
    {
      $group: {
        _id: { u: "$u", nd: "$nd" },
        count: { $sum: 1 },
        docs: { $push: "$$ROOT" },
      },
    },
    {
      $match: { count: { $gt: 1 } },
    },
  ];

  const duplicates = await collection.aggregate(pipeline).toArray();
  console.log(`Found ${duplicates.length} Nepali dates with duplicate records`);

  for (const group of duplicates) {
    const docs = group.docs.sort((a, b) => {
      return new Date(a.ci || a.d) - new Date(b.ci || b.d);
    });

    // Keep the record with check-in (first punch)
    let keep = docs.find((d) => d.ci) || docs[0];
    keep = { ...keep };
    delete keep._id;

    // If check-out exists in any duplicate, use the latest one
    const checkoutDocs = docs.filter((d) => d.co);
    if (checkoutDocs.length > 0) {
      const lastCheckout = checkoutDocs.sort(
        (a, b) => new Date(b.co) - new Date(a.co),
      )[0];
      keep.co = lastCheckout.co;
      keep.el = lastCheckout.el || false;
      if (keep.ci && keep.co) {
        keep.wm = Math.round((new Date(keep.co) - new Date(keep.ci)) / 60000);
      }
    }

    // Delete all duplicates
    await collection.deleteMany({ u: group._id.u, nd: group._id.nd });

    // Insert cleaned record
    await collection.insertOne(keep);

    console.log(`✅ Cleaned: User ${group._id.u}, BS Date: ${group._id.nd}`);
  }

  console.log("\n✨ Cleanup complete!");
  await mongoose.disconnect();
  process.exit(0);
}

cleanupDuplicates().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
