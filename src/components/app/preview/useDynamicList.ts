import {useCallback, useEffect, useMemo, useState, useTransition} from 'react';
import {actions} from 'astro:actions';

type ListResult<T> = { items: T[]; total: number };

export type UseDynamicListOptions = {
    limit?: number;
};

export type UseDynamicListState<T = any> = {
    // data
    items: T[];
    total: number;
    loading: boolean;
    // paging
    page: number;
    limit: number;
    offset: number;
    // filters
    q: string;
    whereJson?: string;
    // actions
    setSearch: (q: string) => void;
    setFilter: (where: object | undefined | null) => void;
    nextPage: () => void;
    prevPage: () => void;
    reload: () => void;
};

const toWhereJson = (obj?: object | null) =>
    obj && Object.keys(obj).length > 0 ? JSON.stringify(obj) : undefined;

export function useDynamicList<T = any>(model: string, options?: UseDynamicListOptions): UseDynamicListState<T> {
    const [q, setQ] = useState('');
    const [whereJson, setWhereJson] = useState<string | undefined>(undefined);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(options?.limit ?? 25);
    const offset = useMemo(() => (page - 1) * limit, [page, limit]);

    const [items, setItems] = useState<T[]>([]);
    const [total, setTotal] = useState(0);

    const [isPending, startTransition] = useTransition();

    const submitAction = async () => {
        startTransition(async () => {
            const {data} = await actions.listEntities({
                model: model as any,
                q: q || undefined,
                limit,
                offset,
                whereJson,
            });
            setItems((data as any).items);
        })
    }


    useEffect(() => {
        submitAction()
    }, [model, q, limit, offset, whereJson]);

    const setSearch = useCallback((value: string) => {
        setPage(1);
        setQ(value);
    }, []);

    const setFilter = useCallback((obj?: object | null) => {
        setPage(1);
        setWhereJson(toWhereJson(obj ?? undefined));
    }, []);

    const nextPage = useCallback(() => {
        const maxPage = Math.max(1, Math.ceil(total / limit));
        setPage((p) => Math.min(maxPage, p + 1));
    }, [total, limit]);

    const prevPage = useCallback(() => {
        setPage((p) => Math.max(1, p - 1));
    }, []);

    const reload = useCallback(() => {
        submitAction()
    }, []);

    return {
        items,
        total,
        loading: isPending,
        page,
        limit,
        offset,
        q,
        whereJson,
        setSearch,
        setFilter,
        nextPage,
        prevPage,
        reload,
    };
}

export default useDynamicList;
