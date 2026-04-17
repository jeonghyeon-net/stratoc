plugins {
    kotlin("jvm")
}

repositories {
    mavenCentral()
}

dependencies {
    testImplementation(kotlin("test"))
}

kotlin {
    jvmToolchain(17)
}

sourceSets {
    main {
        kotlin.srcDirs("src/main/java")
    }
    test {
        kotlin.srcDirs("src/test/java")
    }
}

tasks.test {
    useJUnitPlatform()
}
