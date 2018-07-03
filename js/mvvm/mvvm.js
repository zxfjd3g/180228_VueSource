/*
相当于Vue的构造函数
 */
function MVVM(options) {
  // 将配置到vm上
  this.$options = options;
  // 将data数据对象保存在vm和data变量上
  var data = this._data = this.$options.data;
  // 将vm保存到me变量
  var me = this;

  // 遍历data中所有属性, 并实现对其代理
  Object.keys(data).forEach(function (key) {// 属性名: name
    // 对指定属性名的属性实现代理
    me._proxy(key);
  });

  observe(data, this);

  // 创建一个编译对象
  this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
  $watch: function (key, cb, options) {
    new Watcher(this, key, cb);
  },

  /*
  对指定属性名的属性实现代理
   */
  _proxy: function (key) {
    // 保存vm
    var me = this;
    // 给vm添加属性(使用属性描述符)
    Object.defineProperty(me, key, {
      configurable: false, // 不能重新再定义
      enumerable: true, // 可以枚举
      // 当通过vm.xxx读取属性时自动调用, 去data中获取对应的属性值返回(作为vm的属性值)
      get: function proxyGetter() {
        return me._data[key];
      },
      // 当通过vm.xxx=value改变了属性时自动调用, 将最新的值保存到data中对应的属性上
      set: function proxySetter(newVal) {
        me._data[key] = newVal;
      }
    });
  }
};