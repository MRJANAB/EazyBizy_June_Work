import { useCallback, useEffect } from "react";
import { createPath, useLocation, useNavigate } from "react-router-dom";

const ROUTE_STACK_KEY = "loan-management.route-stack";

const getRouteSnapshot = (location: ReturnType<typeof useLocation>) =>
  createPath({
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
  });

const readRouteStack = () => {
  try {
    const rawValue = window.sessionStorage.getItem(ROUTE_STACK_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
};

const writeRouteStack = (stack: string[]) => {
  window.sessionStorage.setItem(ROUTE_STACK_KEY, JSON.stringify(stack));
};

export const RouteHistoryTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const currentRoute = getRouteSnapshot(location);
    const routeStack = readRouteStack();
    const lastRoute = routeStack[routeStack.length - 1];

    if (lastRoute !== currentRoute) {
      writeRouteStack([...routeStack, currentRoute]);
    }
  }, [location]);

  return null;
};

export const useBackNavigation = (fallbackRoute = "/dashboard") => {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    const currentRoute = getRouteSnapshot(location);
    const state = location.state as { from?: string } | null;
    const originRoute = typeof state?.from === "string" ? state.from : null;
    const routeStack = readRouteStack();
    const filteredStack = routeStack.filter((route) => route !== "");
    const lastRoute = filteredStack[filteredStack.length - 1];
    const normalizedStack =
      lastRoute === currentRoute ? filteredStack.slice(0, -1) : filteredStack;
    const previousRoute = normalizedStack[normalizedStack.length - 1];

    writeRouteStack(normalizedStack);

    if (originRoute && originRoute !== currentRoute) {
      navigate(originRoute, { replace: true });
      return;
    }

    if (previousRoute && previousRoute !== currentRoute) {
      navigate(previousRoute, { replace: true });
      return;
    }

    if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
      return;
    }

    navigate(fallbackRoute, { replace: true });
  }, [fallbackRoute, location, navigate]);
};
