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
    whereJson?: string;
    orderByField?: string;
    orderByDir?: 'asc' | 'desc';
    includeJson?: string;
    // actions
    setFilter: (where: object | undefined | null) => void;
    setSort: (field?: string, dir?: 'asc' | 'desc') => void;
    setInclude: (include: object | undefined | null) => void;
    nextPage: () => void;
    prevPage: () => void;
    reload: () => void;
};

const toWhereJson = (obj?: object | null) =>
    obj && Object.keys(obj).length > 0 ? JSON.stringify(obj) : undefined;

export function useDynamicList<T = any>(model: string, options?: UseDynamicListOptions): UseDynamicListState<T> {
    const [whereJson, setWhereJson] = useState<string | undefined>(undefined);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(options?.limit ?? 25);
    const offset = useMemo(() => (page - 1) * limit, [page, limit]);

    const [items, setItems] = useState<T[]>([]);
    const [total, setTotal] = useState(0);

    const [isPending, startTransition] = useTransition();
    const [orderByField, setOrderByField] = useState<string | undefined>(undefined);
    const [orderByDir, setOrderByDir] = useState<'asc' | 'desc' | undefined>(undefined);
    const [includeJson, setIncludeJson] = useState<string | undefined>(undefined);

    const submitAction = async () => {
        startTransition(async () => {
            const {data} = await actions.listEntities({
                model: model as any,
                limit,
                offset,
                whereJson,
                orderByField,
                orderByDir,
                includeJson,
                smartPreview: true,
            });
            setItems((data as any).items);
            setTotal((data as any).total ?? 0);
        })
    }


    useEffect(() => {
        submitAction()
    }, [model, limit, offset, whereJson, orderByField, orderByDir, includeJson]);

    const setFilter = useCallback((obj?: object | null) => {
        setPage(1);
        setWhereJson(toWhereJson(obj ?? undefined));
    }, []);

    const setSort = useCallback((field?: string, dir?: 'asc' | 'desc') => {
        setPage(1);
        setOrderByField(field);
        setOrderByDir(dir);
    }, []);

    const setInclude = useCallback((obj?: object | null) => {
        setIncludeJson(toWhereJson(obj ?? undefined));
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
        whereJson,
        orderByField,
        orderByDir,
        includeJson,
        setFilter,
        setSort,
        setInclude,
        nextPage,
        prevPage,
        reload,
    };
}

export default useDynamicList;
