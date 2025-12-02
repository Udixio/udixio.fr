import {useCallback, useEffect, useMemo, useRef, useState, useTransition} from 'react';

export type ActionListParams = {
    limit: number;
    offset: number;
    whereJson?: string;
    orderByField?: string;
    orderByDir?: 'asc' | 'desc';
    includeJson?: string;
};

export type ActionListResult<T = any> = { data: { items: T[]; total: number } };

export type UseActionListOptions = {
    limit?: number;
};

export type UseActionListState<T = any> = {
    items: T[];
    total: number;
    loading: boolean;
    page: number;
    limit: number;
    offset: number;
    whereJson?: string;
    orderByField?: string;
    orderByDir?: 'asc' | 'desc';
    includeJson?: string;
    hasMore: boolean;
    // controls
    setFilter: (where: object | undefined | null) => void;
    setSort: (field?: string, dir?: 'asc' | 'desc') => void;
    setInclude: (include: object | undefined | null) => void;
    loadMore: () => void;
    reset: () => void;
    reload: () => void;
};

const toJson = (obj?: object | null) => (obj && Object.keys(obj).length > 0 ? JSON.stringify(obj) : undefined);

export function useActionList<T = any>(
    fetcher: (params: ActionListParams) => Promise<ActionListResult<T> | undefined>,
    options?: UseActionListOptions,
): UseActionListState<T> {
    const [whereJson, setWhereJson] = useState<string | undefined>(undefined);
    const [orderByField, setOrderByField] = useState<string | undefined>(undefined);
    const [orderByDir, setOrderByDir] = useState<'asc' | 'desc' | undefined>(undefined);
    const [includeJson, setIncludeJson] = useState<string | undefined>(undefined);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(options?.limit ?? 25);
    const offset = useMemo(() => (page - 1) * limit, [page, limit]);

    const [items, setItems] = useState<T[]>([]);
    const [total, setTotal] = useState(0);
    const [isPending, startTransition] = useTransition();

    const loadingRef = useRef(false);

    const doFetch = useCallback(async (append: boolean) => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        startTransition(async () => {
            try {
                const res = await fetcher({
                    limit,
                    offset,
                    whereJson,
                    orderByField,
                    orderByDir,
                    includeJson,
                });
                const data = res?.data || {items: [], total: 0};
                setItems((prev) => (append ? [...prev, ...data.items] : data.items));
                setTotal(data.total ?? 0);
            } finally {
                loadingRef.current = false;
            }
        });
    }, [fetcher, limit, offset, whereJson, orderByField, orderByDir, includeJson]);

    // initial and param changes: refresh (not append)
    useEffect(() => {
        void doFetch(false);
    }, [limit, whereJson, orderByField, orderByDir, includeJson]);

    // page change: if page>1, append
    useEffect(() => {
        if (page === 1) return;
        void doFetch(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const setFilter = useCallback((obj?: object | null) => {
        setPage(1);
        setItems([]);
        setWhereJson(toJson(obj ?? undefined));
    }, []);

    const setSort = useCallback((field?: string, dir?: 'asc' | 'desc') => {
        setPage(1);
        setItems([]);
        setOrderByField(field);
        setOrderByDir(dir);
    }, []);

    const setInclude = useCallback((obj?: object | null) => {
        setIncludeJson(toJson(obj ?? undefined));
    }, []);

    const hasMore = (items.length < total);

    const loadMore = useCallback(() => {
        if (!hasMore) return;
        setPage((p) => p + 1);
    }, [hasMore]);

    const reset = useCallback(() => {
        setPage(1);
        setItems([]);
        void doFetch(false);
    }, [doFetch]);

    const reload = useCallback(() => {
        void doFetch(false);
    }, [doFetch]);

    return {
        items,
        total,
        loading: isPending || loadingRef.current,
        page,
        limit,
        offset,
        whereJson,
        orderByField,
        orderByDir,
        includeJson,
        hasMore,
        setFilter,
        setSort,
        setInclude,
        loadMore,
        reset,
        reload,
    };
}

export default useActionList;
