"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getDataMeta, isAuthenticated } from "@/lib/api-client";
import { formatDataMeta } from "@/lib/format-data-meta";

interface DataFreshnessProps {
  className?: string;
}

const LOADING_TEXT = "Carregando data de atualização...";

export function DataFreshness({ className }: DataFreshnessProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const authenticated = mounted && isAuthenticated();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["data-meta"],
    queryFn: getDataMeta,
    enabled: authenticated,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  if (!mounted || (authenticated && isLoading)) {
    return (
      <p className={className} aria-live="polite">
        {LOADING_TEXT}
      </p>
    );
  }

  if (!authenticated) {
    return (
      <p className={className} role="status">
        Data de atualização indisponível (faça login).
      </p>
    );
  }

  if (isError) {
    return (
      <p className={className} role="status">
        Data de atualização indisponível (reinicie a API após o último deploy).
      </p>
    );
  }

  const text = formatDataMeta(data);
  if (!text) {
    return (
      <p className={className} role="status">
        Data de atualização não informada.
      </p>
    );
  }

  return (
    <p
      className={className}
      title="Data/hora do último dbt run (mart_dashboard_pic_kpis)"
      role="status"
    >
      {text}
    </p>
  );
}
