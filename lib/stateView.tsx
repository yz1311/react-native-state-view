
/**
 * 不要将这个组件转换成hooks，有个很奇怪的问题
 * render执行了，但是界面就是不刷新,
 * 具体表现为，长时间呆在某一界面，然后进入到带有该组件的页面
 * 会一直显示loading界面，点击一下才显示下面的内容
 * 只有长时间(大概半分钟)呆在某一界面才会出现
 */
import React, {Component, PureComponent} from 'react';
import {
    ActivityIndicator,
    AppState,
    Dimensions,
    Image,
    ImageStore,
    ImageStyle,
    StyleProp,
    StyleSheet,
    Text, TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import {createReducerResult, LoadDataResultStates} from "./utils";
import {ReducerResult} from "../index";

export interface IProps {
    children?: any;
    loadDataResult: ReducerResult;
    containerStyle?: StyleProp<ViewStyle>;
    bodyStyle?: StyleProp<ViewStyle>;
    /*loading相关的*/
    loadingView?: any;
    loadingTitle?: string;
    loadingTitleStyle?: StyleProp<TextStyle>;
    /*Placeholder相关的*/
    placeholderView?: any; //整个替换placeholder
    placeholderImageRes?: ImageStore; //替换图片原，格式为require('...')
    placeholderTitle?: string; //替换标题
    placeholderImageStyle?: StyleProp<ImageStyle>; //图片样式
    placeholderTitleStyle?: StyleProp<TextStyle>; //标题样式
    /*error相关的*/
    // error?: any,     //服务器返回的状态码
    errorView?: any; //整个替换placeholder
    errorImageRes?: ImageStore; //替换图片原，格式为require('...')
    errorTitle?: string; //替换标题
    errorImageStyle?: StyleProp<ImageStyle>; //图片样式
    errorTitleStyle?: StyleProp<TextStyle>; //标题样式
    errorButtonStyle?: StyleProp<ViewStyle>; //标题样式
    errorButtonTextStyle?: StyleProp<TextStyle>; //标题样式
    networkErrorImageRes?: ImageStore; //替换图片原，格式为require('...')
    serverErrorImageRes?: ImageStore; //替换图片原，格式为require('...')
    errorButtonAction?: any; //标题样式,
    isConnected?: boolean;
    emptyReloadDelay?: number; //空页面时重新加载时的延迟时间(单位:ms)，默认为500，防止出现一闪马上还原的现象
    errorReloadDelay?: number; //错误页面时重新加载时的延迟时间(单位:ms)
}

export interface IState {
    //为了实现，点击刷新按钮自动刷新，将state从props移动到state
    dataState: LoadDataResultStates;
}

const {width: deviceWidth} = Dimensions.get('window');

//初始化时的状态
const initialLoadDataResultState = LoadDataResultStates.loading;

export default class StateView extends PureComponent<IProps, IState> {

    static defaultProps = {
        loadDataResult: createReducerResult(),
        loadingTitle: '正在加载中…',
        isConnected: true,
        emptyReloadDelay: 0,
        errorReloadDelay: 0,
    };

    readonly state: IState = {
        dataState: initialLoadDataResultState,
    };

    componentDidMount() {
        AppState.addEventListener('change', this._handleAppStateChange);
    }

    componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IState>, snapshot?: any) {
        const {isConnected, loadDataResult, errorButtonAction} = this.props;
        if (prevProps.isConnected !== this.props.isConnected) {
            //如果从无网变为有网，并且当前是网络错误的状态，则刷新界面
            if (
                isConnected &&
                loadDataResult.error &&
                !loadDataResult.error.status
            ) {
                errorButtonAction && errorButtonAction();
            }
        }
        if (prevProps.loadDataResult !== this.props.loadDataResult) {
            if (
                loadDataResult.state &&
                (prevProps.loadDataResult.state !== loadDataResult.state ||
                    loadDataResult.state !== initialLoadDataResultState ||
                    loadDataResult.forceUpdate)
            ) {
                this.setState({
                    dataState: loadDataResult.state,
                });
            }
        }
    }

    componentWillUnmount() {
        AppState.removeEventListener('change', this._handleAppStateChange);
    }

    _handleAppStateChange = appState => {
        const {loadDataResult, errorButtonAction} = this.props;
        // 从后台进入到前台的时候,如果是调用超时的错误，重新调取一次接口
        if (appState === 'active') {
            if (
                loadDataResult.state === LoadDataResultStates.error &&
                loadDataResult.error &&
                !loadDataResult.error.status
            ) {
                errorButtonAction && errorButtonAction();
            }
        }
    };

    render () {
        const {
            containerStyle,
            bodyStyle,
            children,
            loadDataResult,
            isConnected,
            loadingView,
            loadingTitle,
            loadingTitleStyle,
            placeholderImageRes,
            networkErrorImageRes,
            serverErrorImageRes,
            placeholderTitle,
            placeholderImageStyle,
            placeholderView,
            placeholderTitleStyle,
            errorTitle,
            errorImageStyle,
            errorTitleStyle,
            errorButtonStyle,
            errorButtonTextStyle,
            errorButtonAction,
            emptyReloadDelay,
            errorReloadDelay,
        } = this.props;
        const {dataState} = this.state;
        //从外部调用静态属性可以，但是组件内部调用的话为undefined,不知道为啥
        //所以用常量代替
        let overlayView = null;
        switch (dataState) {
            // 由于有全局loading的存在，现在不显示
            case LoadDataResultStates.loading:
                overlayView = (
                    <View
                        style={[
                            styles.loading,
                            loadingTitleStyle && loadingTitleStyle,
                        ]}
                    >
                        {loadingView ? (
                            loadingView
                        ) : (
                            <View style={{alignItems: 'center'}}>
                                <ActivityIndicator size={'large'} color={'#333'} />
                                <Text style={styles.title}>
                                    {loadingTitle || '正在加载中…'}
                                </Text>
                            </View>
                        )}
                    </View>
                );
                break;
            //显示placeholder
            case LoadDataResultStates.empty:
                //为了将界面撑起来，并且为后面的下拉刷新作准备
                //不能使用数组，必须使用view将两个对象套起来
                //TouchableOpacity外层还包裹一层view是为了不让点击的时候，看到底部的内容
                overlayView = (
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={args => {
                            if (errorButtonAction) {
                                let lastTimestamp = loadDataResult.timestamp;
                                errorButtonAction(args);
                                if (emptyReloadDelay > 0) {
                                    setTimeout(() => {
                                        //判断数据是否已经发生变化
                                        if (loadDataResult.timestamp === lastTimestamp) {
                                            this.setState({
                                                dataState: initialLoadDataResultState,
                                            });
                                        }
                                    }, emptyReloadDelay);
                                } else {
                                    this.setState({
                                        dataState: initialLoadDataResultState,
                                    });
                                }
                            }
                        }}
                        style={[
                            styles.container,
                            {
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: 0,
                                bottom: 0,
                                backgroundColor: '#f4f4f4',
                            },
                            containerStyle,
                        ]}
                    >
                        {placeholderView ? (
                            placeholderView
                        ) : (
                            <View style={[styles.body, bodyStyle]}>
                                <Image
                                    source={
                                        placeholderImageRes
                                            ? placeholderImageRes
                                            : require('./img/app_nocontent.png')
                                    }
                                    style={[styles.placeholderImg, placeholderImageStyle]} resizeMode="contain"/>
                                <Text
                                    style={[
                                        {
                                            color: '#666666',
                                            marginTop: 15,
                                            fontSize: 16,
                                        },
                                        placeholderTitleStyle,
                                    ]}
                                >
                                    {placeholderTitle
                                        ? placeholderTitle
                                        : '暂时没有数据'}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                );
                break;
            //显示placeholder
            case LoadDataResultStates.error:
                let tempErrorTitle = '服务器开小差了，请等等再试吧...';
                let detailTitle = tempErrorTitle;
                if (loadDataResult.error) {
                    tempErrorTitle = loadDataResult.error.message;
                } else if (errorTitle) {
                    tempErrorTitle = errorTitle;
                }
                let imageRes;
                if (!loadDataResult.error || !loadDataResult.error.status) {
                    imageRes =
                        networkErrorImageRes
                            ? networkErrorImageRes
                            : require('./img/app_error_network.png')
                    //分为无网络和服务器挂了
                    if (!isConnected) {
                        detailTitle = '网络连接失败，请检查网络';
                    }
                }
                //此时是逻辑错误
                else if (
                    loadDataResult.error.status >= 200 &&
                    loadDataResult.error.status < 300
                ) {
                    detailTitle = '';
                }
                //此时是服务器错误 status = 300+
                else {
                    imageRes =
                        serverErrorImageRes
                            ? serverErrorImageRes
                            : require('./img/app_error_server.png')
                    //不同时显示默认值
                    if (detailTitle == tempErrorTitle) {
                        detailTitle = '';
                    }
                }
                return (
                    //为了将界面撑起来，并且为后面的下拉刷新作准备
                    <View style={[styles.container, containerStyle]}>
                        <View style={[styles.body, bodyStyle]}>
                            <Image
                                style={[styles.placeholderImg]}
                                resizeMode="contain"
                                source={imageRes}
                            />
                            <Text
                                style={[
                                    {
                                        color: '#333333',
                                        marginTop: 20,
                                        fontSize: 16,
                                    },
                                    placeholderTitleStyle,
                                ]}
                            >
                                {tempErrorTitle}
                            </Text>
                            <Text
                                style={[
                                    {
                                        color: '#999999',
                                        marginTop: 18,
                                        fontSize: 16,
                                    },
                                    placeholderTitleStyle,
                                ]}
                            >
                                {detailTitle}
                            </Text>
                            {/*没经过服务器的提供刷新按钮*/}
                            {errorButtonAction && (
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={[styles.errorButton, errorButtonStyle]}
                                    onPress={args => {
                                        let lastTimestamp = loadDataResult.timestamp;
                                        errorButtonAction();
                                        if (errorReloadDelay > 0) {
                                            setTimeout(() => {
                                                //判断数据是否已经发生变化
                                                if (loadDataResult.timestamp === lastTimestamp) {
                                                    this.setState({
                                                        dataState: initialLoadDataResultState,
                                                    });
                                                }
                                            }, errorReloadDelay);
                                        } else {
                                            this.setState({
                                                dataState: initialLoadDataResultState,
                                            });
                                        }
                                    }}
                                >
                                    <View>
                                        <Text
                                            style={[
                                                {
                                                    color: '#999999',
                                                    fontSize: 16,
                                                },
                                                errorButtonTextStyle,
                                            ]}
                                        >
                                            点击刷新
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                );
            case LoadDataResultStates.none:
            //有数据，则直接显示
            case LoadDataResultStates.content:
            default:
                overlayView = null;
                break;
        }
        return (
            <View style={[styles.container, containerStyle]}>
                {children}
                {overlayView}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        // position:'absolute',
        // top:0,
        // bottom:0,
        // left:0,
        // right:0,
        flex: 1,
        // alignItems:'center',
        justifyContent: 'center',
        minHeight: 180,
        // paddingTop:60
    },
    body: {
        alignItems: 'center',
        justifyContent: 'center',
        // marginTop:-50
    },
    errorButton: {
        paddingVertical: 14,
        alignSelf: 'stretch',
        alignItems: 'center',
        marginHorizontal: 20,
        borderRadius: 6,
        marginTop: 10,
    },
    loading: {
        // minHeight: 100,
        // minWidth: 100,
        // backgroundColor: "rgba(0, 0, 0, 0.7)",
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        // borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f4f4f4',
        paddingVertical: 18,
        paddingHorizontal: 18,
    },
    title: {
        color: '#333333',
        fontSize: 14,
        marginTop: 10,
    },
    placeholderImg: {
        width: deviceWidth * 0.6,
        maxHeight: 180,
    } as ImageStyle,
});
