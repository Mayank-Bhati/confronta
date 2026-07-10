// App context: theme, translations and shared handlers flow through here so
// presentational components keep a stable module-level identity (defining them
// inside the page component would remount the whole tree on every render).
import React from "react";

export const AppCtx = React.createContext(null);
export const useApp = () => React.useContext(AppCtx);
