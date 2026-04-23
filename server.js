import { readFile, writeFile } from "fs/promises";
import { createServer } from "http";
import crypto from "crypto";
import path from "path";

const PORT = 5000;
const DATA_FILE = path.join("data", "links.json");

// 🔹 Load data safely
const loadLinks = async () => {
    try {
        const data = await readFile(DATA_FILE, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        if (error.code === "ENOENT") {
            // file not found → create it
            await writeFile(DATA_FILE, JSON.stringify({}));
            return {};
        }
        console.error("Load Error:", error);
        return {};
    }
};

// 🔹 Save data
const saveLinks = async (links) => {
    await writeFile(DATA_FILE, JSON.stringify(links, null, 2));
};

// 🔹 Server
const server = createServer(async (req, res) => {
    console.log("Request:", req.method, req.url);

    try {
        if (req.method === "GET" && req.url === "/") {
            const data = await readFile(
                path.join(process.cwd(), "public", "index.html")
            );
            res.writeHead(200, { "Content-Type": "text/html" });
            return res.end(data);
        }

       
        if (req.method === "GET" && req.url === "/style.css") {
            const data = await readFile(
                path.join(process.cwd(), "public", "style.css")
            );
            res.writeHead(200, { "Content-Type": "text/css" });
            return res.end(data);
        }

        if (req.method === "POST" && req.url === "/shorten") {
            let body = "";

            req.on("data", chunk => {
                body += chunk;
            });

            req.on("end", async () => {

                // 🔹 Safe JSON parse
                let parsed;
                try {
                    parsed = JSON.parse(body);
                } catch {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ error: "Invalid JSON" }));
                }

                const { url, shortcode } = parsed;

                if (!url) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ error: "URL is required" }));
                }

                const links = await loadLinks();

                const finalShortcode =
                    shortcode || crypto.randomBytes(4).toString("hex");

                if (links[finalShortcode]) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(
                        JSON.stringify({ error: "Shortcode already exists" })
                    );
                }

                links[finalShortcode] = url;
                await saveLinks(links);

                res.writeHead(200, { "Content-Type": "application/json" });
                return res.end(
                    JSON.stringify({
                        success: true,
                        short: `http://localhost:${PORT}/${finalShortcode}`,
                    })
                );
            });

            return;
        }

        
        if (req.method === "GET") {
            const shortcode = req.url.slice(1);
            const links = await loadLinks();

            if (links[shortcode]) {
                res.writeHead(302, { Location: links[shortcode] });
                return res.end();
            }
        }

       
        res.writeHead(404);
        res.end("Not Found");

    } catch (err) {
        console.error("Server Error:", err);
        res.writeHead(500);
        res.end("Server Error");
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});