################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
CPP_SRCS += \
../nsPyContext.cpp \
../nsPyDOMModule.cpp \
../nsPyRuntime.cpp 

OBJS += \
./nsPyContext.o \
./nsPyDOMModule.o \
./nsPyRuntime.o 

CPP_DEPS += \
./nsPyContext.d \
./nsPyDOMModule.d \
./nsPyRuntime.d 


# Each subdirectory must supply rules for building sources it contributes
%.o: ../%.cpp
	@echo 'Building file: $<'
	@echo 'Invoking: GCC C++ Compiler'
	g++ -I/home/karolis/xulrunner-sdk/include -O3 -Wall -c -fmessage-length=0 -fshort-wchar -fPIC -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.d)" -o"$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


