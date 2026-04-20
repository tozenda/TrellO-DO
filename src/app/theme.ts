import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

export function createThemeConfig(isDarkMode: boolean): ThemeConfig {
  return {
    algorithm: isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: "#1677ff",
      colorInfo: "#1677ff",
      colorSuccess: "#14b8a6",
      colorWarning: "#d97706",
      colorError: "#ef4444",
      borderRadius: 14,
      fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      colorBgBase: isDarkMode ? "#0b1220" : "#f5f7fa",
      colorBgContainer: isDarkMode ? "#101828" : "#ffffff",
      colorText: isDarkMode ? "#f8fafc" : "#101828",
      colorTextSecondary: isDarkMode ? "#98a2b3" : "#667085",
      colorBorderSecondary: isDarkMode ? "#1f2937" : "#eaecf0",
    },
    components: {
      Layout: {
        bodyBg: isDarkMode ? "#0b1220" : "#f5f7fa",
        siderBg: isDarkMode ? "#101828" : "#ffffff",
      },
      Card: {
        borderRadiusLG: 18,
      },
      Button: {
        borderRadius: 12,
        controlHeight: 40,
      },
      Input: {
        borderRadius: 12,
        controlHeight: 42,
      },
      Modal: {
        borderRadiusLG: 20,
      },
    },
  };
}
