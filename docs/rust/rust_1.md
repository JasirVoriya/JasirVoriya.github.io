---
tags:
  - rust
---
# Rust入门

## 安装

### Rustup

Rustup是一个Rust安装器和版本管理工具

### Cargo

Cargo是一个Rust的构建工具和包管理器：

* `cargo new` 创建项目
* `cargo build` 编译项目
* `cargo run` 编译并运行项目
* `cargo test` 测试项目
* `cargo doc` 为项目创建文档
* `cargo publish` 将库发布到 crates.io

### 安装

`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

执行上面的命令会同时安装`rustup`和`cargo`，所有工具都安装在`~/.cargo/bin`中，包括`rustc`、`cargo`、`rustup`等：

```shell
 .cargo
├──  bin
│   ├──  cargo
│   ├──  cargo-clippy
│   ├──  cargo-fmt
│   ├──  cargo-miri
│   ├──  clippy-driver
│   ├──  rls
│   ├──  rust-analyzer
│   ├──  rust-gdb
│   ├──  rust-gdbgui
│   ├──  rust-lldb
│   ├──  rustc
│   ├──  rustdoc
│   ├──  rustfmt
│   └──  rustup
├──  env
└──  registry
    ├──  cache
    │   └──  index.crates.io-6f17d22bba15001f
    ├──  CACHEDIR.TAG
    ├──  index
    │   └──  index.crates.io-6f17d22bba15001f
    └──  src
        └──  index.crates.io-6f17d22bba15001f
```

`rustup`元数据和工具链将会安装在`~/.rustup`：

```shell
 .rustup
├──  downloads
├──  settings.toml
├──  tmp
├──  toolchains
│   └──  stable-x86_64-unknown-linux-gnu
│       ├──  bin
│       ├──  etc
│       ├──  lib
│       ├──  libexec
│       └──  share
└──  update-hashes
    └──  stable-x86_64-unknown-linux-gnu
```

安装完成后，会修改你的`~/.profile`文件和`~/.bashrc`文件，自动将这些路径添加到你的环境变量当中。
安装完成，输入如下指令，可以看到版本信息：

```shell
$ rustc --version
rustc 1.76.0 (07dca489a 2024-02-04)

$ cargo -V
cargo 1.76.0 (c84b36747 2024-01-18)

$ rustup -V
rustup 1.26.0 (5af9b9484 2023-04-05)
info: This is the version for the rustup toolchain manager, not the rustc compiler.
info: The currently active `rustc` version is `rustc 1.76.0 (07dca489a 2024-02-04)`
```

运行`rustup self uninstall`来卸载Rust。

## 创建项目

```shell
cargo new guessing_game #创建项目
cd guessing_game # 进入项目目录
```

项目结构如下：

```shell
 guessing_game
├──  Cargo.lock #参考nodejs的lock文件，作用是一样的，记录插件详细版本
├──  Cargo.toml #Rust 的清单文件。其中包含了项目的元数据和依赖库。
└──  src
    └──  main.rs #为编写应用代码的地方
```

在 `Cargo.toml` 中添加crate（在 Rust 中，我们通常把依赖包称作“crates”）:

```toml
[dependencies]
rand = "0.8.5" # 表示大于等于 0.8.5 但小于 0.9.0 的版本，具体使用什么版本， Cargo.lock 会有详细记录
```

现在我们有了一个外部依赖，Cargo 从 registry 上获取所有包的最新版本信息，这是一份来自 Crates.io 的数据拷贝。Crates.io 是 Rust 生态环境中的开发者们向他人贡献 Rust 开源项目的地方。

编辑 `main.rs`，输入如下代码（代码细节已经写在了注释当中）：

```rust
use rand::Rng;
use std::cmp::Ordering;
use std::io;
fn main() {
    println!("Guess the number!");
    /*
    这里使用了范围表达式：start..end左闭右开，start..=end左闭右闭，这里是1到100闭区间
    默认整形是i32，但是Rust可以根据上下文推断类型，因为下文中guess是u32，所以Rust推断secret_number是u32
     */
    let secret_number = rand::thread_rng().gen_range(1..=100);
    loop {
        println!("Please input your guess.");
        /*
        ::表示关联函数(也就是静态方法)，String::new()返回一个新的空字符串
        mut表示可变变量，Rust默认变量是不可变的
        read_line()返回一个io::Result，Result是一个枚举类型，有两个变体：Ok和Err
        如果Result是Err，expect方法会导致程序崩溃并显示expect中的信息
        如果Result是Ok，expect方法会返回Ok中的值
        */
        let mut guess = String::new();
        io::stdin() //stdin()函数返回一个std::io::Stdin的实例
            .read_line(&mut guess) //追加读入，不会覆盖，&表示引用
            .expect("Failed to read line");
        /*
        rust允许使用同一个变量名来遮蔽之前的变量名，常用于转换变量类型
        trim()方法去除字符串首尾的空白字符，这里是去除回车确认时的换行符
        parse()方法将字符串转换为数字，我们需要告诉Rust具体的数字类型，guess后面的: u32表示guess是u32类型
        parse()方法返回一个Result枚举，要么是Ok，要么是Err，这里使用match表达式处理这两种情况
        */
        let guess: u32 = match guess.trim().parse() {
            Ok(num) => num,     //Ok(num)表示parse()方法返回的是Ok，num是Ok中的值
            Err(_) => continue, //_是通配符，表示匹配所有Err的情况，continue表示跳过本次循环
        };
        println!("You guessed: {guess}");
        /*
        因为guess是u32，所以Rust推断secret_number也是u32
         */
        match guess.cmp(&secret_number) {
            Ordering::Less => println!("Too small!"),
            Ordering::Greater => println!("Too big!"),
            Ordering::Equal => {
                println!("You win!");
                break;
            }
        }
    }
}
```

现在输入 `cargo build` 编译项目：

```shell
$ cargo build
   Compiling libc v0.2.153
   Compiling cfg-if v1.0.0
   Compiling ppv-lite86 v0.2.17
   Compiling getrandom v0.2.12
   Compiling rand_core v0.6.4
   Compiling rand_chacha v0.3.1
   Compiling rand v0.8.5
   Compiling guessing_game v0.1.0 (/root/proj/rust/guessing_game)
    Finished dev [unoptimized + debuginfo] target(s) in 1.10s
```

编译成功之后，会在根目录下生成`target`目录：

```shell
 guessing_game
├──  Cargo.lock
├──  Cargo.toml
├──  src
│   └──  main.rs
└──  target
    ├──  CACHEDIR.TAG
    └──  debug
        ├──  build
        │   ├──  libc-57276666dfbfbfe7
        │   └──  libc-b71bc10a0a044bfd
        ├──  deps
        │   ├──  cfg_if-a4e1ca4231ab3b1f.d
        │   ├──  getrandom-77eeb39b841ef42e.d
        │   ├──  guessing_game-3fb26747fda5a286
        │   ├──  guessing_game-3fb26747fda5a286.d
        │   ├──  libc-43502890872dbc77.d
        │   ├──  libcfg_if-a4e1ca4231ab3b1f.rlib
        │   ├──  libcfg_if-a4e1ca4231ab3b1f.rmeta
        │   ├──  libgetrandom-77eeb39b841ef42e.rlib
        │   ├──  libgetrandom-77eeb39b841ef42e.rmeta
        │   ├──  liblibc-43502890872dbc77.rlib
        │   ├──  liblibc-43502890872dbc77.rmeta
        │   ├──  libppv_lite86-75d3a003153bde67.rlib
        │   ├──  libppv_lite86-75d3a003153bde67.rmeta
        │   ├──  librand-84e4a591f02b6f76.rlib
        │   ├──  librand-84e4a591f02b6f76.rmeta
        │   ├──  librand_chacha-68d8fbe09fb6a9ae.rlib
        │   ├──  librand_chacha-68d8fbe09fb6a9ae.rmeta
        │   ├──  librand_core-9dcfe4cdef14f12b.rlib
        │   ├──  librand_core-9dcfe4cdef14f12b.rmeta
        │   ├──  ppv_lite86-75d3a003153bde67.d
        │   ├──  rand-84e4a591f02b6f76.d
        │   ├──  rand_chacha-68d8fbe09fb6a9ae.d
        │   └──  rand_core-9dcfe4cdef14f12b.d
        ├──  examples
        ├──  guessing_game
        ├──  guessing_game.d
        └──  incremental
            └──  guessing_game-3uzigiqgkkbxj
```

编译成功之后，输入 `cargo run` 即可运行。