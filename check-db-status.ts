import { initializeApp as initFirebaseApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";

async function diagnose() {
  console.log("=== DB DIAGNOSTIC START ===");
  const DB_FILE = path.join(process.cwd(), "db.json");
  
  // 1. Check local db.json
  if (fs.existsSync(DB_FILE)) {
    try {
      const localDB = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      console.log(`[Local db.json] Found:`);
      console.log(`  - Companies: ${localDB.companies?.length || 0}`);
      localDB.companies?.forEach((c: any) => console.log(`    * ID: ${c.id}, Name: ${c.name}`));
      console.log(`  - Users: ${localDB.users?.length || 0}`);
      console.log(`  - Clients: ${localDB.clients?.length || 0}`);
      console.log(`  - Loans: ${localDB.loans?.length || 0}`);
    } catch (e: any) {
      console.error("[Local db.json] Failed to parse: ", e.message);
    }
  } else {
    console.log("[Local db.json] db.json does not exist locally.");
  }

  // 2. Check remote Firestore
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(firebaseConfigPath)) {
    try {
      const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
      console.log(`[Firestore Config] Loaded for project: ${firebaseConfig.projectId}`);
      const firebaseApp = initFirebaseApp(firebaseConfig);
      const firestore = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

      const colRef = collection(firestore, "companies");
      const snapshot = await getDocs(colRef);
      console.log(`[Firestore Cloud] Found:`);
      console.log(`  - Companies in Firestore: ${snapshot.docs.length}`);
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`    * Document ID: ${doc.id}, Name: ${data.name}`);
      });
    } catch (e: any) {
      console.error("[Firestore Cloud] Failed to connect/fetch: ", e.message || e);
    }
  } else {
    console.warn("[Firestore Config] firebase-applet-config.json not found.");
  }
  console.log("=== DB DIAGNOSTIC END ===");
}

diagnose();
