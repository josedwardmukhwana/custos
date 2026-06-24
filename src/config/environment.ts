import dotenv from "dotenv";
import path from "path";

export const configure = async () => {
  const envPath = path.resolve(__dirname, '.env');
  
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    console.error("DEBUG: Could not find .env at:", envPath);
    throw result.error;
  }
  
  const environment = {
    SITE: process.env.ERP_SITE,
    USERNAME: process.env.ERP_USERNAME,
    PASSWORD: process.env.ERP_PASSWORD,
    PORT: process.env.PORT
  };

  if (!environment.SITE || !environment.USERNAME || !environment.PASSWORD || !environment.PORT) {
    throw new Error("Missing required environment variables in .env file at " + envPath);
  }
};