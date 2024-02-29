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

## 堆栈内存

堆栈内存属于操作系统的内存管理，C/C++程序员对这个概念非常熟悉，Rust也是一样的。

栈和堆都是在运行时管理内存的两种方式，栈是后进先出的数据结构，堆是一种无序的数据结构。

栈中的数据大小必须是固定的，在编译时就必须知道数据的大小，所以栈中的数据大小是固定的。

而堆中的数据大小是不固定的，当申请堆内存时，我们需要提供申请的大小，然后内存分配器去寻找大小合适的空闲内存，并将其内存地址返回。所以堆中的数据大小是动态的。  

因为指向堆内存的指针是一个固定大小的数据，所以我们可以将指针放到栈中，而指针指向的数据放到堆中。所以我们访问堆时，需要通过指针来访问，先从栈中找到指针，然后通过指针找到堆中的数据。

入栈比在堆上分配内存更快，因为它只需要在栈顶分配内存，然后移动栈指针，而堆内存分配需要在堆中寻找合适的内存块，然后做一些记录，所以堆内存分配比栈内存分配慢。

同时，栈内存的访问速度也比堆内存的访问速度快，因为栈内存是连续的，而堆内存是不连续的（每次申请新内存所寻找到的地方都不一样），所以内存跳转的次数更多，访问速度更慢。处理器在处理的数据彼此较近的时候（比如在栈上）比较远的时候（比如可能在堆上）能更好的工作。

我们平时的函数调用，函数的参数和返回值都是通过栈来传递的，因为栈的速度更快，而且栈的数据大小是固定的，所以栈更适合存放函数的参数和返回值。

函数的递归调用也是通过栈来实现的，函数递归能够写出精简易读的代码，但是递归调用的层次过深会导致栈溢出，其性能并不是很好，像一些算法如：DP、DFS、BFS等，都可以通过递归来实现，但是递归调用的层次过深会导致栈溢出，所以这些算法一般都是通过循环来实现。

所以，栈内存适合存放固定大小的数据，而堆内存适合存放动态大小的数据。

## 所有权

所有权是Rust最为独特的特性，它是Rust的核心概念之一，所有权系统是Rust的一大特色，它使得Rust能够在不使用垃圾回收的情况下，保障内存安全。

编程语言管理内存有两种方式：一是GC垃圾回收，二是手动管理内存。Rust选择了第三种方式：所有权系统：

通过所有权系统管理内存，编译器在编译时会根据一系列的规则进行检查。如果违反了任何这些规则，程序都不能编译。在运行时，所有权系统的任何功能都不会减慢程序。

听起来非常的Amazing，但是所有权系统的规则也是非常严格的，这也是Rust的学习曲线比较陡的原因。

栈内存的分配和释放是由编译器自动完成的，所有权主要处理的是堆内存的分配和释放，知道哪些代码拥有哪些堆内存，以及何时释放这些堆内存，一旦理解了所有权，就不需要经常考虑栈和堆了。

所有权系统的核心概念是：

* 每一个值都有一个被称为其 所有者（owner）的变量。

* 一个值在任一时刻有且只有一个所有者。

* 当所有者（变量）离开作用域，这个值将被丢弃。

### 内存释放

内存在拥有它的变量离开作用域后就被自动释放（堆内存的释放是由编译器自动完成的），这个过程是由编译器自动完成的，不需要程序员手动释放内存，这就是Rust的内存安全的原因之一：

```rust
fn main() {
    {
        let s = String::from("hello");//s是String类型的变量，它拥有堆内存
    }//s离开作用域，堆内存被释放
}
```

这其实是C++的RAII（Resource Acquisition Is Initialization）的思想，C++中的智能指针就是基于这个思想的，这个模式对编写 Rust 代码的方式有着深远的影响。

现在，我们假设一个问题：如果我们有一个字符串，我们将它赋值给另一个作用域下的变量：

```rust
fn main() {
    let s1 = String::from("hello");
    {
        let s2 = s1; //浅拷贝，s2和s1指向同一块堆内存
    } //s2离开作用域，堆内存被释放
    println!("{s1}, world!"); //堆内存已经被释放
}
```

String的元数据如`len`、`capacity`和`ptr`是在栈上的，而String的内容是在堆上的，当我们将s1赋值给s2时，s1的元数据会被复制到s2中，但是内容还是在堆上，所以s1和s2都指向同一块堆内存，如下图所示：

![20240229170430](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/20240229170430.png)

这时，s2离开作用域，堆内存被释放，可是s1还在使用这块堆内存，会导致s1使用了一个已经释放的内存。同时，s1离开作用域，会再次释放这块内存，这就是内存的`二次释放`，会导致程序崩溃。

所以，Rust禁止了这种操作，上面的赋值操作不是浅拷贝，而是数据移动。

### 数据移动

```rust
fn main() {
    let s1 = String::from("hello");
    {
        let s2 = s1; //数据移动，不是浅拷贝，s1的值被移动到s2中
    } //s2离开作用域，堆内存被释放
    println!("{s1}, world!"); //这里会报错，因为s1的值已经被移动到s2中了，Rust 禁止你使用无效的引用
}
```

这个在很多编程语言中都有，叫做浅拷贝，但是Rust中的这种赋值操作不是浅拷贝，而是移动：

![20240229165132](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/20240229165132.png)

移动也叫所有权转让，是指当我们将一个变量赋值给另一个变量时，原来的变量将不再有效，所以我们叫他移动，而不是浅拷贝，s1的值被移动到s2中了，s1不再有效，所以这里会报错。

Rust直接禁止了这种操作，使得之前的变量无效，这样就避免了内存的二次释放。

### 数据克隆

如果我们确实需要深拷贝，我们可以使用`clone`方法：

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1.clone(); //深拷贝，s1的值被复制到s2中
    println!("{s1}, {s2}");
}
```

这段代码中，s1的值被复制到s2中，这就是深拷贝，s1和s2指向不同的堆内存，如下图所示：

![20240229171634](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/20240229171634.png)

但是，深拷贝会导致堆内存的分配和释放，所以深拷贝的开销是比较大的，所以Rust默认是移动，而不是深拷贝。

### 拷贝

Rust有一个特殊的注解`Copy`，它是一种 trait，如果一个类型拥有`Copy` trait，那么它的值可以在赋值后继续使用，而不会使之前的变量无效，这就是浅拷贝。

Rust中的整型是拥有`Copy` trait的，所以整型可以进行浅拷贝：

```rust
fn main() {
    let x = 5;
    let y = x; //浅拷贝，x的值被复制到y中
    println!("{x}, {y}");
}
```

下面是一些拥有`Copy` trait的类型：

* 所有整数类型，比如`u32`。
* 布尔类型，`bool`。
* 所有浮点类型，比如`f64`。
* 字符类型，`char`。
* 元组，但是前提是元组中的每个元素都拥有`Copy` trait。

作为一个通用的规则，任何简单标量值的组合可以是`Copy`的，不需要分配内存或某种形式资源的类型是`Copy`的。

### 所有权和函数

函数传参同样遵守所有权规则，函数的参数也会发生所有权的转移：

```rust
fn main() {
    let s = String::from("hello"); // s 进入作用域
    takes_ownership(s); // s 的值移动到函数里 ...
    println!("{}", s); // 这里会报错，因为 s 的值已经被移走
    let x = 5; // x 进入作用域
    makes_copy(x); // x 应该移动函数里，但 i32 是 Copy 的，所以在后面可继续使用 x
    println!("{}", x); // 这里不会报错，因为 x 的值已经被复制了
} // 这里，x 先移出了作用域，然后是 s。但因为 s 的值已被移走，没有特殊之处

fn takes_ownership(some_string: String) {
    // some_string 进入作用域
    println!("{}", some_string);
} // 这里，some_string 移出作用域并调用 `drop` 方法。
  // 占用的内存被释放

fn makes_copy(some_integer: i32) {
    // some_integer 进入作用域
    println!("{}", some_integer);
} // 这里，some_integer 移出作用域。没有特殊之处

```

函数的返回值也有转移所有权的操作：

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = takes_and_gives_back(s1); //s1已经被移动到takes_and_gives_back函数中，所以这里不能再使用s1
    println!("s2: {}", s2);
    let s3 = String::from("hello");
    let s4 = takes_and_gives_back(s3.clone()); //s3的所有权被复制到takes_and_gives_back函数中，所以这里还可以使用s3
    println!("s3: {}", s3);
    println!("s4: {}", s4);
}
fn takes_and_gives_back(mut str: String) -> String {
    str.push_str("+");
    str //返回str的所有权
}
```

变量的所有权总是遵循相同的模式：将值赋给另一个变量时移动它。当持有堆中数据值的变量离开作用域时，其值将通过 drop 被清理掉，除非数据被移动为另一个变量所有（或者说，变量已经没有所有者时，其值将通过 drop 被清理掉）。

如果我们想对一个变量传入函数进行修改，但是在每一个函数中，都获取所有权，然后返回所有权，这样会非常麻烦，同时过多的数据移动会导致性能下降，所以Rust提供了引用来解决这个问题。

## 引用和借用

引用可以在传值的时候，允许你使用值但不获取其所有权：

```rust
fn main() {
    let s1 = String::from("hello");
    let len = calculate_length(&s1); //传递s1的引用，&s1创建了一个指向s1的引用，但是不获取s1的所有权
    println!("The length of '{s1}' is {len}");
}
fn calculate_length(s: &String) -> usize { //s是String的引用
    s.len() //返回s的长度
}//s离开作用域，但是因为它只是s1的引用，所以不会释放s1的堆内存
```

示意图，s指向了s1：

![20240229180409](https://raw.githubusercontent.com/JasirVoriya/images-bed/master/image/20240229180409.png)

我们将创建一个引用的行为称为 借用（borrowing）。
