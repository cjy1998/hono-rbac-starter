import path from "node:path";
import process from "node:process";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const { combine, timestamp, errors, splat, json, colorize, printf } =
  winston.format;

/** 日志根目录。默认是工作目录下的 logs/，可被 LOG_DIR 覆盖 */
const LOG_DIR = process.env.LOG_DIR ?? path.resolve(process.cwd(), "logs");

/**
 * 日志级别。优先取 LOG_LEVEL；否则生产环境用 info，开发环境用 debug。
 * winston 内置级别（由高到低）：error < warn < info < http < verbose < debug < silly
 */
const LOG_LEVEL =
  process.env.LOG_LEVEL ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * 文件日志格式（JSON）
 * - timestamp 加上毫秒，便于排查接口耗时与并发顺序
 * - errors({ stack: true }) 让 Error 对象自动展开为 message + stack
 * - splat 支持 logger.info("user %s login", name) 的占位符写法
 */
const fileFormat = combine(
  timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  errors({ stack: true }),
  splat(),
  json(),
);

/**
 * 控制台日志格式（彩色、单行）
 * 形如：[2026-05-16 22:14:45.690] info: request received {"requestId":"..."}
 */
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  errors({ stack: true }),
  splat(),
  printf((info) => {
    const { timestamp: ts, level, message, stack, ...meta } = info;
    const metaKeys = Object.keys(meta).filter((k) => k !== "service");
    const metaStr = metaKeys.length
      ? ` ${JSON.stringify(
          metaKeys.reduce<Record<string, unknown>>((acc, k) => {
            acc[k] = meta[k];
            return acc;
          }, {}),
        )}`
      : "";
    return `[${ts}] ${level}: ${stack ?? message}${metaStr}`;
  }),
);

/**
 * 全量日志（>= LOG_LEVEL）按日期切分
 * - 文件名形如 application-2026-05-16.log
 * - zippedArchive：跨天后旧文件自动 gzip 压缩为 .log.gz
 * - maxSize：单文件超过 20MB 时立即滚动
 * - maxFiles：最多保留 14 天，更早的会被自动删除
 * 该 transport 还会在日志目录生成 .<hash>-audit.json，用于追踪轮转状态
 */
const appRotateTransport = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: "application-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
  level: LOG_LEVEL,
});

/**
 * 错误日志单独成文件，保留更久（30 天），便于事故复盘
 */
const errorRotateTransport = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: "error-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "30d",
  level: "error",
});

/**
 * 应用唯一 logger 实例。
 * - defaultMeta：所有日志会带上 service 字段，便于多服务汇聚时区分来源
 * - handleExceptions / handleRejections：让未捕获异常、未处理的 Promise
 *   reject 都进入日志系统，而不是被 Node 默认行为吃掉
 * - exitOnError: false：写日志时即使出错也不要让进程退出
 */
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: "hono-test" },
  format: fileFormat,
  transports: [
    new winston.transports.Console({
      format: IS_PROD ? fileFormat : consoleFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
    appRotateTransport,
    errorRotateTransport,
  ],
  exitOnError: false,
});

export type Logger = typeof logger;
