import StateView from "./lib/stateView";
import {createReducerResult, createPagingResult, LoadDataResultStates, dataToPagingResult, dataToReducerResult} from './lib/utils';

/**
 * 基础数据结果对象
 */
interface ReducerResult {
    //是否成功
    success: boolean;
    //时间戳
    timestamp: Date;
    //错误时的错误信息，可能为服务器错误和本地错误
    //success为true时，error为null
    error: Error & {status?: number};
    //是否显示loading，默认为false
    showLoading: boolean;
    //当前的数据状态
    state?: LoadDataResultStates;
    //是否强制刷新
    forceUpdate?: boolean;
}

/**
 * 分页数据结果对象
 */
interface PagingResult<T = unknown> {
    //数据列表
    dataList: Array<T>;
    //是否有下一页
    noMore: boolean;
    //数据结果对象
    loadDataResult: ReducerResult;
}

export {
    StateView,
    createReducerResult,
    createPagingResult,
    LoadDataResultStates,
    ReducerResult,
    PagingResult,
    dataToPagingResult,
    dataToReducerResult
}
