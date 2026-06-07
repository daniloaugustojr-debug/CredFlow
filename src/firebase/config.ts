import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize client-side Firebase instance
const app = initializeApp(firebaseConfig);

// Export instances
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Critical connection verifier check on initial app launch (as mandated by skills documentation)
export async function testConnection() {
  try {
    const testDocRef = doc(db, "_test_system", "connection");
    await getDocFromServer(testDocRef);
    console.log("Firebase connection operational - Online cache enabled.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.warn("Persistent cache is executing in offline mode.");
    }
  }
}
testConnection();
