class MyPromise {
    constructor(exector) {
        // 初始化状态
        this.initValue();
        // 初始化 this 指向
        this.initBind();

        // 执行传进来的函数，出错执行 reject
        try {
            exector(this.resolve, this.reject);
        } catch (e) {
            this.reject(e);
        }
    }

    initValue() {
        // 初始状态为 pending
        this.status = 'pending';
        this.result = null;

        // 保存 成功 时的回调
        this.onFulfilledCallbacks = [];
        // 保存 失败 时的回调
        this.onRejectedCallbacks = [];
    }

    initBind() {
        this.resolve = this.resolve.bind(this);
        this.reject = this.reject.bind(this);
    }

    static resolve(value) {
        return new MyPromise((resolve, reject) => {
            if (value instanceof MyPromise) {
                value.then(resolve, reject);
            } else {
                resolve(value)
            }
        })
    }

    static reject(reason) {
        return new MyPromise((resolve, reject) => {
            reject(reason);
        })
    }

    resolve(value) {
        if (this.status !== 'pending') return;

        // 状态变更
        this.status = 'fulfilled';
        // 终值
        this.result = value;

        // 正常情况下，resolve reject 先执行，存储回调的数组为空，下面不会执行
        // resolve reject 为异步时，then 中的回调保存到回调数组中，resolve reject 执行时执行下面
        while (this.onFulfilledCallbacks.length) {
            this.onFulfilledCallbacks.shift()(this.result);
        }
    }

    reject(reason) {
        if (this.status !== 'pending') return;

        // 状态变更
        this.status = 'rejected';
        // 终值
        this.result = reason;

        while (this.onRejectedCallbacks.length) {
            this.onRejectedCallbacks.shift()(this.result);
        }
    }

    then(onFulfilled, onRejected) {
        // 参数校验
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : val => val;
        onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason };

        var thenPromise = new MyPromise((resolve, reject) => {
            const resolvePromise = cb => {
                queueMicrotask(() => {
                    try {
                        const x = cb(this.result);
                        if (x === null || x === undefined) return
                        if (thenPromise && x === thenPromise) {
                            throw new Error('禁止循环引用');
                        }
                        if (x instanceof MyPromise) {
                            // 为什么 then 里的两个回调函数传递的是 resolve 和 reject ? => 值穿透
                            x.then(resolve, reject);
                        } else {
                            resolve(x);
                        }
                    } catch (error) {
                        reject(error);
                    }
                })
            }
            if (this.status === 'fulfilled') {
                resolvePromise(onFulfilled);
            } else if (this.status === 'rejected') {
                resolvePromise(onRejected);
            } else if (this.status === 'pending') {
                this.onFulfilledCallbacks.push(resolvePromise.bind(this, onFulfilled));
                this.onRejectedCallbacks.push(resolvePromise.bind(this, onRejected));
            }
        })

        return thenPromise;
    }

    // 接收一个Promise数组，数组中如有非Promise项，则此项当做成功
    // 如果所有Promise都成功，则返回成功结果数组
    // 如果有一个Promise失败，则返回这个失败结果
    static all(promises) {
        const isIterable = promises != null && typeof promises[Symbol.iterator] === 'function';
        if (!isIterable) {
            throw new TypeError(`${promises} is not iterable (cannot read property Symbol(Symbol.iterator))`);
        }
        const result = [];
        let count = 0;
        return new MyPromise((resolve, reject) => {
            try {                
                const addData = (index, value) => {
                    result[index] = value;
                    count++;
                    if (count === promises.length) resolve(result);
                }

                promises.forEach((promise, index) => {
                    if (promise instanceof MyPromise) {
                        promise.then(res => {
                            addData(index, res);
                        }, err => reject(err));
                    } else {
                        addData(index, promise);
                    }
                })
            } catch (error) {
                reject(error);
            }
        })
    }

    // 接收一个 Promise 数组，数组中如有非 Promise 项，则此项当做成功
    // 哪个 Promise 最快得到结果，就返回那个结果，无论成功失败
    static race(promises) {        
        const isIterable = promises != null && typeof promises[Symbol.iterator] === 'function';
        if (!isIterable) {
            throw new TypeError(`${promises} is not iterable (cannot read property Symbol(Symbol.iterator))`);
        }

        return new MyPromise((resolve, reject) => {
            promises.forEach(promise => {
                if (promise instanceof MyPromise) {
                    promise.then(res => {
                        resolve(res);
                    }, err => {
                        reject(err);
                    })
                } else {
                    resolve(promise);
                }
            })
        })
    }

    // 接收一个 Promise 数组， 数组中如有非 Promise 项， 则此项当做成功
    // 把每一个 Promise 的结果集合成数组返回
    static allSettled(promises) {        
        const isIterable = promises != null && typeof promises[Symbol.iterator] === 'function';
        if (!isIterable) {
            throw new TypeError(`${promises} is not iterable (cannot read property Symbol(Symbol.iterator))`);
        }

        return new MyPromise((resolve, reject) => {
            const result = [];
            let count = 0;
            const addData = (status, value, i) => {
                result[i] = { status, value };
                count++;
                if (count === promises.length) {
                    resolve(result);
                }
            }

            promises.forEach((promise, i) => {
                if (promise instanceof MyPromise) {
                    promise.then(res => {
                        addData('fulfilled', res, i);
                    }, err => {
                        addData('rejected', err, i);
                    })
                } else {
                    addData('fulfilled', promise, i);
                }
            })

        })
    }

    // 接收一个 Promise 数组，数组中如果有非 Promise 项，则此项当做成功
    // 如果有一个 Promise 成功， 则返回这个成功结果
    // 如果所有 Promise 都失败，则报错
    static any(promises) {        
        const isIterable = promises != null && typeof promises[Symbol.iterator] === 'function';
        if (!isIterable) {
            throw new TypeError(`${promises} is not iterable (cannot read property Symbol(Symbol.iterator))`);
        }

        return new MyPromise((resolve, reject) => {
            let count = 0;
            promises.forEach((promise) => {
                promise.then(res => {
                    resolve(res);
                }, err => {
                    count ++;
                    if (count === promises.length) {
                        reject(new AggregateError('All promises were rejected !'));
                    }
                })
            })
        })
    }
}

module.exports = { MyPromise };
