function Compile(el, vm) {
  // 保存vm
  this.$vm = vm;
  // 保存el元素
  this.$el = this.isElementNode(el) ? el : document.querySelector(el);
  // 只有当el元素存在
  if (this.$el) {
    // 1. 取出el中所有子节点并保存到内存的fragment容器中
    this.$fragment = this.node2Fragment(this.$el);
    // 2. 初始化编译(对fragment中所有层次的子节点)
    this.init();
    // 3. 将fragment添加到el中显示
    this.$el.appendChild(this.$fragment);
  }
}

Compile.prototype = {
  node2Fragment: function (el) {
    // 创建内存中的fragment容器
    var fragment = document.createDocumentFragment(),
      child;

    // 遍历el中所有子节点, 将转移到fragment中
    while (child = el.firstChild) {
      fragment.appendChild(child);
    }
    // 返回fragment
    return fragment;
  },

  init: function () {
    // 编译fragment中所有子节点
    this.compileElement(this.$fragment);
  },

  /*
  编译指定元素的所有子节点, 同时利用递归实现所有层次子节点的编译
  1. element中的指令属性
  2. 大括号列表式格式的文本节点
   */
  compileElement: function (el) {
    // 得到所有外层子节点
    var childNodes = el.childNodes,
      // 保存编译对象
      me = this;
    // 遍历子节点
    [].slice.call(childNodes).forEach(function (node) {
      // 得到节点的文本内容
      var text = node.textContent;
      // 定义正则(配置大括号列表式的)
      var reg = /\{\{(.+)\}\}/;  // {{name}}

      // 如果是元素节点
      if (me.isElementNode(node)) {
        // 编译标签中的指令属性
        me.compile(node);
      // 如果是大括号表达式格式的文本节点
      } else if (me.isTextNode(node) && reg.test(text)) {
        // 编译大括号表达式格式的文本节点
        me.compileText(node, RegExp.$1); // 表达式: name
      }

      // 如果当前子节点还有子节点, 进行递归调用, 实现对所有层次子节点的编译
      if (node.childNodes && node.childNodes.length) {
        me.compileElement(node);
      }
    });
  },

  compile: function (node) {
    // 得到所有属性节点
    var nodeAttrs = node.attributes,
      // 保存编译对象
      me = this;
    // 遍历所有属性
    [].slice.call(nodeAttrs).forEach(function (attr) {
      // 得到属性名: v-on:click
      var attrName = attr.name;
      // 如果是指令属性
      if (me.isDirective(attrName)) {
        // 得到属性值(表达式): show
        var exp = attr.value;
        // 得到指令名: on:click
        var dir = attrName.substring(2);
        // 如果是事件指令
        if (me.isEventDirective(dir)) {
          // 进行事件指令编译
          compileUtil.eventHandler(node, me.$vm, exp, dir);
          // 如果是普通指令
        } else {
          // 得到指令对应的编译工具函数进行执行编译: text/html/class
          compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
        }

        // 移除指令属性
        node.removeAttribute(attrName);
      }
    });
  },

  // 编译文本节点
  compileText: function (node, exp) {// exp: 表达式(name)
    // 调用编译工具对象的text()进行编译
    compileUtil.text(node, this.$vm, exp);
  },

  isDirective: function (attr) {
    return attr.indexOf('v-') == 0;
  },

  isEventDirective: function (dir) {
    return dir.indexOf('on') === 0;
  },

  isElementNode: function (node) {
    return node.nodeType == 1;
  },

  isTextNode: function (node) {
    return node.nodeType == 3;
  }
};

// 用于解析指令/大括号表达式的工具对象
var compileUtil = {
  // 编译v-text/大括号表达式的工具函数
  text: function (node, vm, exp) {
    this.bind(node, vm, exp, 'text');
  },

  // 编译v-html的工具函数
  html: function (node, vm, exp) {
    this.bind(node, vm, exp, 'html');
  },

  // 编译v-model的工具函数
  model: function (node, vm, exp) {
    this.bind(node, vm, exp, 'model');

    var me = this,
      val = this._getVMVal(vm, exp);
    node.addEventListener('input', function (e) {
      var newValue = e.target.value;
      if (val === newValue) {
        return;
      }

      me._setVMVal(vm, exp, newValue);
      val = newValue;
    });
  },

  // 编译v-class的工具函数
  class: function (node, vm, exp) {
    this.bind(node, vm, exp, 'class');
  },

  /*
  真正编译指令的工具函数
  node: 节点
  vm: mvvm的实例
  exp: 表达式: name
  dir: 指令名: text
   */
  bind: function (node, vm, exp, dir) {

    // 根据指令名来得到对应的节点更新函数
    var updaterFn = updater[dir + 'Updater'];

    // 执行更新函数去更新节点, 实现初始化显示
    updaterFn && updaterFn(node, this._getVMVal(vm, exp));

    new Watcher(vm, exp, function (value, oldValue) {
      updaterFn && updaterFn(node, value, oldValue);
    });
  },

  /*
  exp: 表达式(show)
  dir: 指令名(on:click)
   */
  eventHandler: function (node, vm, exp, dir) {
    // 得到事件名/类型: click
    var eventType = dir.split(':')[1],
      // 根据表达式从methods配置中取出对应的函数
      fn = vm.$options.methods && vm.$options.methods[exp];
    // 如果都存在
    if (eventType && fn) {
      // 给节点绑定指定事件名和回调函数(强制绑定this为vm)的dom事件监听
      node.addEventListener(eventType, fn.bind(vm), false);
    }
  },

  // 得到指定表达式所对应的值
  _getVMVal: function (vm, exp) {
    var val = vm._data;
    exp = exp.split('.');
    exp.forEach(function (k) {
      val = val[k];
    });
    return val;
  },

  _setVMVal: function (vm, exp, value) {
    var val = vm._data;
    exp = exp.split('.');
    exp.forEach(function (k, i) {
      // 非最后一个key，更新val的值
      if (i < exp.length - 1) {
        val = val[k];
      } else {
        val[k] = value;
      }
    });
  }
};

// 包含了n个用于更新节点的方法
var updater = {
  // 更新节点的textContent属性
  textUpdater: function (node, value) {
    node.textContent = typeof value == 'undefined' ? '' : value;
  },

  // 更新节点的innerHTML属性
  htmlUpdater: function (node, value) {
    node.innerHTML = typeof value == 'undefined' ? '' : value;
  },

  // 更新节点的className属性
  classUpdater: function (node, value, oldValue) {
    var className = node.className;
    node.className = (className ? className+' ' : '') + value;
  },

  // 更新节点的value属性
  modelUpdater: function (node, value, oldValue) {
    node.value = typeof value == 'undefined' ? '' : value;
  }
};