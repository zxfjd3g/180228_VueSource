function Observer(data) {
  // 保存data数据对象
  this.data = data;
  // 开启对data中数据的劫持工作
  this.walk(data);
}

Observer.prototype = {
  walk: function (data) {
    var me = this;
    // 遍历data中所有属性
    Object.keys(data).forEach(function (key) {
      // 给data重新定义响应式属性
      me.defineReactive(data, key, data[key]);
    });
  },
  /*convert: function (key, val) {
    this.defineReactive(this.data, key, val);
  },
*/
  defineReactive: function (data, key, val) {
    // 为当前属性创建对应的dep对象
    var dep = new Dep();
    // 通过隐式递归调用实现对所有层次属性的劫持
    var childObj = observe(val);
    // 给data重新定义key属性(添加getter/setter)
    Object.defineProperty(data, key, {
      enumerable: true, // 可枚举
      configurable: false, // 不能再define
      // 返回属性值--建立dep与watcher之间的关系
      get: function () {
        if (Dep.target) {
          dep.depend();
        }
        return val;
      },
      // 一旦属性值发生了改变, 通知dep/watcher去更新界面
      set: function (newVal) {
        if (newVal === val) {
          return;
        }
        val = newVal;
        // 新的值是object的话，进行监听
        childObj = observe(newVal);
        // 通知订阅者
        dep.notify();
      }
    });
  }
};

function observe(value, vm) {
  if (!value || typeof value !== 'object') {
    return;
  }

  // 创建一个观察者对象
  return new Observer(value);
};


var uid = 0;

function Dep() {
  this.id = uid++;
  this.subs = [];
}

Dep.prototype = {
  addSub: function (sub) {
    this.subs.push(sub);
  },

  depend: function () {
    Dep.target.addDep(this);
  },

  removeSub: function (sub) {
    var index = this.subs.indexOf(sub);
    if (index != -1) {
      this.subs.splice(index, 1);
    }
  },

  // 通知所有相关的watcher
  notify: function () {
    this.subs.forEach(function (sub) {
      sub.update();
    });
  }
};

Dep.target = null;