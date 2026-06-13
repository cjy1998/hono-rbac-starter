import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    // 不参与 lint 的目录（编译产物、迁移、依赖、日志）
    ignores: ["dist/**", "drizzle/**", "node_modules/**", "logs/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // 允许以下划线开头的未使用参数（常见于中间件签名占位）
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // 关闭与 Prettier 冲突的格式化类规则，放在最后生效
  eslintConfigPrettier,
);
