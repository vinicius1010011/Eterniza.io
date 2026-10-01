import axios from "axios";
import fs from "fs";
import { pipeline } from "stream/promises";

export async function downloadFile(url: string, destinationPath: string): Promise<void> {
    const response = await axios.get(url, {
        responseType: "stream",
        timeout: 60_000,
    });

    await pipeline(response.data, fs.createWriteStream(destinationPath));
}