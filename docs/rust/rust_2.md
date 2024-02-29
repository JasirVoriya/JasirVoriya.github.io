---
tags:
  - rust
---
# Rust常见概念

## 变量和可变性

### 变量和常量

rust默认变量不可变：

```rust
/*
let关键字用于声明变量，变量名后面必须指定类型，Rust可以根据上下文推断类型，所以可以省略类型
mut关键字用于声明可变变量，Rust默认变量是不可变的
*/
let x = 5;
x = x + 1; //报错，x不可变
```

rust定义可变变量，需要加上mut关键字：

```rust
let mut x = 5;
x = x + 1; //编译正确，x可变
```

常量必须指定类型，且不能被mut修饰：

```rust
/*
常量必须指定类型，不能使用mut关键字，Rust 对常量的命名约定是在单词之间使用全大写加下划线
常量的计算是在编译时进行的，所以必须是常量表达式，不能是函数调用的结果或者任何其他只能在运行时计算得到的值
*/
const THREE_HOURS_IN_SECONDS: u32 = 60 * 60 * 3;
println!("The value of THREE_HOURS_IN_SECONDS is: {THREE_HOURS_IN_SECONDS}");
```

### 变量隐藏

rust允许定义相同名称的变量，Rustacean 们称之为第一个变量被第二个 隐藏（Shadowing）了，当你使用变量名称时，编译器看到的是第二个变量：

```rust
fn main() {
    let x = 5; //将变量x绑定到5
    let x = x + 1; //将变量x重新绑定到6
    {
        let x = x * 2; //将变量x重新绑定到12
        println!("The value of x in the inner scope is: {x}");
    }
    //因为12是在内部作用域中绑定的，所以这里的x是外部作用域的x，所以这里的x是6
    println!("The value of x is: {x}");
}

```

变量隐藏的本质是创建了一个新的变量，如果变量名相同，则使用最近那个。

该特性常用于变量类型的转换，如用户输入一个字符串，我们希望知道有多少个空格：

```rust
fn main() {
    /*
    隐藏通常用来改变变量的类型，例如，我们可以从一个字符串类型变量变成一个数字类型变量：
    */
    let spaces = "   ";
    let spaces = spaces.len(); //隐藏spaces，变成一个数字类型变量
    println!("The value of spaces is: {spaces}");
}

```

第一个 `spaces` 变量是字符串类型，第二个 `spaces` 变量是数字类型。隐藏使我们不必使用不同的名字，如 `spaces_str` 和 `spaces_num`；相反，我们可以复用 spaces 这个更简单的名字。

### mut和隐藏结合

不可变变量被隐藏之后，还是不可变，但是有趣的是，隐藏和mut结合，我们可以完成不可变到可变之间的转换：

```rust
fn main() {
    /*
    有趣的是，我们可以结合隐藏和mut，使得不可变变量，变成可变变量（因为隐藏的本质是，创建了一个新的变量）：
    */
    let x = 5; //不可变变量
    println!("The value of x is: {x}");
    let mut x = x; //隐藏x，变成可变变量
    x = x + 1; //改变x的值
    println!("The value of x is: {x}");
}
```

你会发现`x`变成6了。

那我们可以完成可变到不可变的转换吗？我们编写如下代码：

```rust
fn main() {
    /*
    有趣的是，我们可以结合隐藏和mut，使得不可变变量，变成可变变量（因为隐藏的本质是，创建了一个新的变量）：
    */
    println!("\nmut_and_shadowing");
    let mut x = 5; //可变变量
    x = x + 1;
    println!("The value of x is: {x}");
    let x = x; //隐藏x，变成不可变变量
    x = x + 1; //这里会报错，因为x是不可变变量
    println!("The value of x is: {x}");
}
```

编译不通过，因为`x`变成了不可变变量。

所以，mut和隐藏相结合，居然可以改变变量的可变性！

其实根本原理是，隐藏会创建一个全新的变量，然后屏蔽之前的变量，所以判断变量能不能被修改，全看新变量有没有被`mut`修饰。

## 数据类型

记住，Rust 是 静态类型（statically typed）语言，也就是说在编译时就必须知道所有变量的类型。根据值及其使用方式，编译器通常可以推断出我们想要用的类型。

### 标量

标量类型代表一个单独的值，Rust有四大类：整形、浮点型、布尔型和字符类型。

#### 整形

|长度|有符号|无符号|
|---|---|---|
|8-bit|i8|u8|
|16-bit|i16|u16|
|32-bit|i32|u32|
|128-bit|i128|u128|
|arch|isize|usize|

数字默认类型是 `i32`，`isize`和`usize`主要作为某些集合的索引。

如果发生整型溢出，在`debug`模式下，会使程序`panic`，而`release`模式下则不会，和 C++ 一样。

#### 浮点型

Rust有两个浮点型：`f32`和`f64`，默认是`f64`，因为在现代CPU中，它与`f32`速度几乎一样，所有浮点型都是有符号的。

#### 数值运算

运算规则和C++一样

#### 布尔型

布尔型有两个值：`true`和`false`，占用1字节。

```rust
fn main() {
    let t = true;

    let f: bool = false; // with explicit type annotation
}
```

#### 字符类型

```rust
fn main() {
    let c = 'z';
    let z: char = 'ℤ'; // with explicit type annotation
    let heart_eyed_cat = '😻';
}
```

单引号是字符类型，双引号是字符串类型，字符类型占用4字节，代表了一个 Unicode 标量值（Unicode Scalar Value

### 复合类型

复合类型可以将多个值组合成一个类型。Rust 有两个原生的复合类型：元组（tuple）和数组（array）。

#### 元组

元组是一个将多个其他类型的值组合进一个复合类型的主要方式。元组长度固定：一旦声明，其长度不会增大或缩小。

```rust
let tup: (i32, f64, u8) = (500, 6.4, 1);//声明元组，元组可以包含不同类型的值
let (x, y, z) = tup;//解构元组，将元组的值绑定到变量上
println!("The value of y is: {}, x is: {}, z is: {}", y, x, z);
println!("The value of z is: {}", tup.2);//通过索引访问元组的值，元组不能用下标运算符访问
println!("tup: {:?}", tup);//打印元组
```

不带任何值的元组有个特殊的名称，叫做 单元（unit） 元组。这种值以及对应的类型都写作 ()，表示空值或空的返回类型。如果表达式不返回任何其他值，则会隐式返回单元值。

#### 数组

数组是可以在栈 (stack) 上分配的已知固定大小的单个内存块。可以使用索引来访问数组的元素，rust会做数组越界检查：

```rust
//数组
let a = [1, 2, 3, 4, 5];
let first = a[0];
let second = a[1];
println!("first: {}, second: {}", first, second);
println!("a: {:?}", a);

let a: [i32; 5] = [1, 2, 3, 4, 5];//声明数组，数组的类型是 [i32; 5]
println!("a: {:?}", a);
let a = [3; 5];//声明数组，数组的类型是 [i32; 5]，数组的值是 [3, 3, 3, 3, 3]
println!("a: {:?}", a);
```

## 函数

Rust 代码中的函数和变量名使用 snake case 规范风格。在函数签名中，必须 声明每个参数的类型：

```rust
fn another_function(x: i32) //函数签名
{
    println!("The value of x is: {x}");
}
```

具有返回值的函数，必须在箭头（->）后面声明返回值的类型，如果不写return，则返回值是最后一行的表达式，这和C++一样：

```rust
fn five() -> i32 {
    5 //返回值是5
}
```

Rust里面有一个 语句(Statements) 和 表达式(Expressions) 的概念（虽然其他语言也有，但是Rust更加严格）：

* 表达式是有值的，而语句是没有值的。

表达式后面可以加上分号，变成语句，但是语句不能变成表达式。

```rust
fn main() {
    let x = 5;
    let y = {
        let x = 3;
        x + 1 //这是一个表达式，有值
    };
    println!("The value of y is: {y}");
}
fn plus_one(x: i32) -> i32 {
    x + 1; //这是一个语句，没有值，会报错
}
```

## 控制流

Rust 有三种控制流：if表达式、循环和match表达式（match将在后面结合枚举类一起讲）：

### if表达式

if表达式的条件必须是bool类型，不能是其他类型，Rust不会自动转换非bool类型到bool类型，这和C++不一样：

```rust
fn main() {
    let number = 3;
    if number < 5 { //条件必须是bool类型
        println!("condition was true");
    } else {
        println!("condition was false");
    }

    if number { //这里会报错，因为number不是bool类型
        println!("number is not zero");
    }
}
```

注意，这里说的是 if表达式，而不是 if语句，既然是表达式，那么就有返回值，我们可以将if表达式的返回值赋给一个变量：

```rust
fn main() {
    let condition = true;
    let number = if condition { 5 } else { 6 };//if表达式的返回值是5
    println!("The value of number is: {number}");
}
```

这也是和C++不一样的地方，C++的if语句是没有返回值的，Rust可以使用if表达式来代替三元运算符，但注意的是，if表达式的两个分支必顽保持一致的类型。

### 循环

Rust有三种循环：loop、while和for：

#### loop

loop是一个无限循环，可以使用break来退出循环，同时也是一个表达式，可以通过break返回一个值：

```rust
fn main() {
    let mut counter = 0;
    let result = loop {
        counter += 1;
        if counter == 10 {
            break counter * 2; //退出循环，并返回counter * 2
        }
    };
    println!("The result is: {result}");
}
```

loop多用于不知道循环次数的情况，或者用于中间获取计算的结果。

#### while

while循环和C++一样，while不是表达式，不能通过break返回值：

```rust
fn while_test() {
    /*
    while关键字用于创建一个条件循环，可以使用break关键字来退出循环
    */
    println!("\nwhile_test");
    let mut number = 10;
    while number != 0 {
        println!("{number}");
        number -= 1;
    }
    println!("LIFTOFF!!!");
}
```

#### for

for循环和C++一样，for不是表达式，不能通过break返回值：

```rust 
fn for_test() {
    /*
    for关键字用于创建一个循环，可以使用break关键字来退出循环
    */
    println!("\nfor_test");
    let a = [10, 20, 30, 40, 50];
    for element in a.iter() {
        println!("{element}");
    }
}
```

## 所有权

Rust 通过所有权系统管理内存，所有权系统的核心概念是：

* 每一个值都有一个被称为其 所有者（owner）的变量。

* 一个值在任一时刻有且只有一个所有者。

* 当所有者（变量）离开作用域，这个值将被丢弃。

Rust中的变量绑定是一个值和一个变量名的关联，当变量离开作用域时，这个值将被丢弃。

