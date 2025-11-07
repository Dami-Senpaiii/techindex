diff --git a/.eleventy.js b/.eleventy.js
new file mode 100644
index 0000000000000000000000000000000000000000..5f315f08a700c33e18f553b0f1e81fcdb903b706
--- /dev/null
+++ b/.eleventy.js
@@ -0,0 +1,37 @@
+// .eleventy.js (root)
+export default function(eleventyConfig) {
+  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
+
+  eleventyConfig.addFilter("date", (value) => {
+    if (value === "now") {
+      return new Date();
+    }
+    return value instanceof Date ? value : new Date(value);
+  });
+
+  eleventyConfig.addFilter("dateCH", (d) =>
+    new Date(d).toLocaleDateString("de-CH", {
+      day: "2-digit", month: "short", year: "numeric"
+    })
+  );
+
+  eleventyConfig.addCollection("posts", (api) =>
+    api
+      .getFilteredByGlob("src/posts/**/*.md")
+      .sort((a, b) => new Date(b.date) - new Date(a.date))
+  );
+
+  return {
+    dir: {
+      input: "src", // <— IMPORTANT: tells 11ty to look inside ./src
+      includes: "_includes", // <— resolves includes at ./src/_includes
+      layouts: "_includes", // <— Eleventy 3 defaults to ./src/_includes/layouts
+      data: "_data",
+      output: "_site"
+    },
+    templateFormats: ["njk", "md", "html"],
+    markdownTemplateEngine: "njk",
+    htmlTemplateEngine: "njk"
+  };
+}
+  
