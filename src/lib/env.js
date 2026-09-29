import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This ensures .env is found whether running from root, src/, or prisma/
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
