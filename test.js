const { MyPromise } = require('./index.js');

// let p = new MyPromise((resolve, reject) => {
//     // resolve(100);
//     reject(1);
// }).then(res => console.log('res', res), err => console.log('err', err))
//     .then(res => res * 2, err => err * 3)

// console.log(2)

// console.log('P => ', p);

// const p1 = MyPromise.reject(3);
// const p2 = 42;
// const p3 = new MyPromise((resolve, reject) => {
//     setTimeout(resolve, 100, 'foo')
// })

MyPromise.allSettled().then((res) => {
    console.log(res)
}, err => { console.log(err) })
