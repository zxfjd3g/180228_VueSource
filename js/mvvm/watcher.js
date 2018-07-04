function Watcher(vm, exp, cb) {
  this.cb = cb; // 用于更新界面节点的回调函数
  this.vm = vm;
  this.exp = exp; // 节点包含的表达式
  this.depIds = {}; // 保存n个相关的dep的对象容器(属性名是dep的id, 属性值是dep)
  this.value = this.get(); // 得到表达式所对应的value
}

Watcher.prototype = {
  update: function () {
    this.run();
  },
  run: function () {
    // 获取表达式最新值
    var value = this.get();
    // 得到表达式原来值
    var oldVal = this.value;
    // 如果变化 了
    if (value !== oldVal) {
      // 保存最新的值
      this.value = value;
      // 调用更新节点的回调函数
      this.cb.call(this.vm, value, oldVal);
    }
  },
  addDep: function (dep) {
    // 如果关系还没有建立
    if (!this.depIds.hasOwnProperty(dep.id)) {
      // 将当前watcher保存到dep的subs中
      dep.addSub(this);  // dep到watcher的关系
      // 将dep保存到当前watcher的depIds上
      this.depIds[dep.id] = dep;  // watcher到dep的关系
    }
  },
  get: function () {
    // 给dep指指定watcher
    Dep.target = this;
    // 读取表达式在data中对应的值, 会导致相关属性的getter调用, 建立对应的dep与当前watcher之间的关系
    var value = this.getVMVal();
    // 去除Dep上的watcher
    Dep.target = null;
    return value;
  },

  getVMVal: function () {
    var exp = this.exp.split('.');
    var val = this.vm._data;
    exp.forEach(function (k) {
      val = val[k];
    });
    return val;
  }
};