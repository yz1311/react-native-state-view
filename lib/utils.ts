/**
 * YZStateView的状态枚举
 */
import {PagingResult, ReducerResult} from "../index";

export enum LoadDataResultStates {
    none = 'none',
    //正在加载数据，由于全局loading的存在，现在应为透明
    loading = 'loading',
    //表明调用成功，但是数据为空
    empty = 'empty',
    //表示调用成功，并且有数据
    content = 'content',
    //表明调用失败，此时显示错误信息
    error = 'error',
    //表明当前用户未登录或者token过期
    unlogged = 'unlogged',
}


/**
 * 创建基础数据结果对象
 * @param params
 */
export const createReducerResult = (
    params: Partial<ReducerResult> = undefined,
): ReducerResult => {
    let showLoading = true; //默认加载的时候loading界面，如需取消，请传递false过来
    if (params) {
        showLoading = params.showLoading;
    }
    return {
        //success字段为兼容以前的代码，与error字段含义相反
        success: false,
        timestamp: new Date(),
        error: null,
        ...(params || {}),
        showLoading,
    };
};

/**
 * 创建分页数据结果对象
 * @param params
 */
export const createPagingResult = <T = unknown>(
    params: Partial<PagingResult<T>> = undefined
): PagingResult<T> => {
    return {
        dataList: [],
        loadDataResult: createReducerResult(),
        noMore: false,
        pageIndex: 1,
        ...(params || {})
    };
}

/**
 * 转换为分页数据对象
 * totalPage、totalSize均可以为空，加这两个，主要是针对部分接口，
 * 如果pageIndex的数量超过现存总量的分页数据，会直接报404，而不是返回一个空数组
 * @param exitList  已存在的列表数据
 * @param pagingList  返回的分页列表数据
 * @param pageIndex  当前页(从1开始)
 * @param pageSize  页数大小(默认为10)
 * @param totalPage 总页数(可能为空)
 * @param totalSize 总数据量(可能为空)
 */
export const dataToPagingResult = <T = unknown>(
    exitList: Array<T>,
    pagingList: Array<T>,
    pageIndex: number,
    pageSize: number = 10,
    totalPage = undefined,
    totalSize = undefined,
): PagingResult<T> => {
    let dataList = exitList
        .slice(0, (pageIndex - 1) * pageSize)
        .concat(pagingList);
    let noMore =
        (pagingList || []).length === 0 || (pagingList || []).length < pageSize;
    if (totalPage != undefined && pageIndex == totalPage) {
        noMore = true;
    }
    if (totalSize != undefined && dataList.length >= totalSize) {
        noMore = true;
    }
    return {
        dataList: dataList,
        noMore: noMore,
        loadDataResult: dataToReducerResult(dataList, pageIndex),
        //如果数据为空，则不自增页码
        pageIndex: pageIndex + ((pagingList || []).length === 0 ? 0 : 1)
    };
};

/**
 * 将结果转换为reducerResult对象
 * @param data 接口返回的对象数据
 * @param pageIndex 当前的页数，可选参数，非分页的list数据不要传，因为分页数据加载失败后，
 * 不一定要显示全部的错误页面，只在列表下面显示错误信息就行了
 */
export const dataToReducerResult = (
    data,
    pageIndex?: number,
): ReducerResult => {
    //Error对象,说明调用接口报错(服务器错误或者业务错误)
    if (data instanceof Error) {
        return {
            ...createReducerResult(),
            success: false,
            error: data,
            msg: data.message,
            state:
                //如果是分页并且不是第一页的情况下，则加载错误时不显示整个错误页面
                pageIndex > 1
                    ? LoadDataResultStates.content
                    : LoadDataResultStates.error,
        } as ReducerResult;
    }
    //如果是数组，就说明是常规的列表对象，空数组表示数据为空
    if (Array.isArray(data)) {
        return {
            ...createReducerResult(),
            success: true,
            timestamp: new Date(),
            state:
                data.length == 0
                    ? LoadDataResultStates.empty
                    : LoadDataResultStates.content,
            pageIndex: pageIndex,
        } as ReducerResult;
    }
    //如果是空字符串或者空对象，则表示数据为空
    if (
        data == undefined ||
        data == '' ||
        (typeof data === 'object' && Object.keys(data).length == 0)
    ) {
        return {
            ...createReducerResult(),
            success: true,
            timestamp: new Date(),
            state: LoadDataResultStates.empty,
        } as ReducerResult;
    }
    return {
        ...createReducerResult(),
        success: true,
        timestamp: new Date(),
        state: LoadDataResultStates.content,
    } as ReducerResult;
};
