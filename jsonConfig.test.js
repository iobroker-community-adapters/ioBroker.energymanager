const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

describe("jsonConfig migration", () => {
    const rootDir = __dirname;
    const adminDir = path.join(rootDir, "admin");
    const jsonConfigPath = path.join(adminDir, "jsonConfig.json");
    const i18nDir = path.join(adminDir, "i18n");

    function collectTexts(node, texts = new Set()) {
        if (!node || typeof node !== "object") {
            return texts;
        }

        for (const property of ["label", "help", "text"]) {
            if (typeof node[property] === "string") {
                texts.add(node[property]);
            }
        }

        if (Array.isArray(node.options)) {
            for (const option of node.options) {
                if (option && typeof option.label === "string") {
                    texts.add(option.label);
                }
            }
        }

        for (const value of Object.values(node)) {
            if (value && typeof value === "object") {
                collectTexts(value, texts);
            }
        }

        return texts;
    }

    it("uses json admin UI and removes legacy admin files", () => {
        const ioPackage = JSON.parse(fs.readFileSync(path.join(rootDir, "io-package.json"), "utf8"));

        assert.deepStrictEqual(ioPackage.common.adminUI, { config: "json" });
        assert.equal(fs.existsSync(path.join(adminDir, "index_m.html")), false);
        assert.equal(fs.existsSync(path.join(adminDir, "words.js")), false);
        assert.equal(fs.existsSync(jsonConfigPath), true);
    });

    it("migrates the legacy admin fields to jsonConfig", () => {
        const jsonConfig = JSON.parse(fs.readFileSync(jsonConfigPath, "utf8"));

        assert.equal(jsonConfig.items.managerAddress.type, "text");
        assert.equal(jsonConfig.items.managerIntervall.type, "text");
        assert.equal(jsonConfig.items.managerPassword.type, "password");
        assert.equal(jsonConfig.items.managerRounding.type, "select");
        assert.equal(jsonConfig.items.managerStateExpireTimeout.type, "text");
    });

    it("provides translations for all jsonConfig texts", () => {
        const jsonConfig = JSON.parse(fs.readFileSync(jsonConfigPath, "utf8"));
        const files = fs.readdirSync(i18nDir).filter(file => file.endsWith(".json")).sort();
        const texts = [...collectTexts(jsonConfig)].sort();

        assert.equal(jsonConfig.i18n, true);
        assert.ok(files.includes("de.json"));
        assert.ok(files.includes("en.json"));

        for (const file of files) {
            const translations = JSON.parse(fs.readFileSync(path.join(i18nDir, file), "utf8"));
            for (const text of texts) {
                assert.equal(typeof translations[text], "string", `Missing translation for ${text} in ${file}`);
            }
        }
    });
});
