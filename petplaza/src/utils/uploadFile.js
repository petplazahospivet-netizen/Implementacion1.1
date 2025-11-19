// src/utils/uploadFile.js
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../components/firebase";

export async function subirArchivo(file, folder = "expedientes") {
  try {
    const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return url;
  } catch (error) {
    console.error("❌ Error al subir archivo a Firebase:", error);
    throw error;
  }
}